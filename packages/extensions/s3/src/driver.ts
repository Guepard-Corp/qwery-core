import { performance } from 'node:perf_hooks';
import { z } from 'zod';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import {
  DatasourceMetadataZodSchema,
  withTimeout,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  getQueryEngineConnection,
  type QueryEngineConnection,
} from '@qwery/extensions-sdk';

const ConfigSchema = z
  .object({
    aws_access_key_id: z
      .string()
      .min(1)
      .describe('AWS access key ID'),
    aws_secret_access_key: z
      .string()
      .min(1)
      .describe('AWS secret access key secret:true'),
    region: z
      .string()
      .min(1)
      .describe('AWS region (e.g. us-east-1)'),
    endpoint_url: z
      .string()
      .url()
      .optional()
      .describe('Custom S3 endpoint URL for compatible providers (DigitalOcean, MinIO, etc)'),
    bucket: z
      .string()
      .min(1)
      .describe('S3 bucket name'),
    prefix: z
      .string()
      .optional()
      .default('')
      .describe('Prefix (folder) inside the bucket to scan for Parquet files'),
    includes: z
      .array(z.string())
      .optional()
      .describe(
        'Optional include patterns relative to the bucket (e.g. **/*.parquet). First match is used.',
      ),
    excludes: z
      .array(z.string())
      .optional()
      .describe('Optional exclude patterns (currently informational only)'),
  })
  .transform((data) => {
    const trimmedPrefix = (data.prefix ?? '').replace(/^\/+|\/+$/g, '');
    const includes = data.includes ?? [];
    const includePattern =
      includes.length > 0
        ? includes[0]?.replace(/^\/+/, '') ?? ''
        : trimmedPrefix
          ? `${trimmedPrefix}/**/*.parquet`
          : '**/*.parquet';

    const key = `${data.bucket}/${includePattern}`;

    return {
      ...data,
      prefix: trimmedPrefix,
      includePattern,
      urlPattern: `s3://${key}`,
      cacheKey: `${data.region}|${data.endpoint_url ?? ''}|${key}`,
    };
  });

type DriverConfig = z.infer<typeof ConfigSchema>;

const VIEW_NAME = 'data';

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

type S3ConfigurableConnection = {
  run: (sql: string) => Promise<unknown>;
};

async function configureS3Connection(
  conn: S3ConfigurableConnection,
  config: DriverConfig,
): Promise<void> {
  await conn.run('INSTALL httpfs;');
  await conn.run('LOAD httpfs;');

  await conn.run(`SET s3_region='${escapeSingleQuotes(config.region)}';`);
  await conn.run(
    `SET s3_access_key_id='${escapeSingleQuotes(config.aws_access_key_id)}';`,
  );
  await conn.run(
    `SET s3_secret_access_key='${escapeSingleQuotes(config.aws_secret_access_key)}';`,
  );

  if (config.endpoint_url) {
    await conn.run(
      `SET s3_endpoint='${escapeSingleQuotes(config.endpoint_url)}';`,
    );
    await conn.run(`SET s3_url_style='path';`);
  }
}

export function makeS3ParquetDriver(context: DriverContext): IDataSourceDriver {
  const instanceMap = new Map<
    string,
    Awaited<ReturnType<typeof createDuckDbInstance>>
  >();

  const createDuckDbInstance = async () => {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(':memory:');
    return instance;
  };

  const getInstance = async (config: DriverConfig) => {
    const key = config.cacheKey;
    if (!instanceMap.has(key)) {
      const instance = await createDuckDbInstance();
      const conn = await instance.connect();

      try {
        await configureS3Connection(conn, config);

        const escapedUrl = escapeSingleQuotes(config.urlPattern);
        const escapedViewName = VIEW_NAME.replace(/"/g, '""');

        await conn.run(`
          CREATE OR REPLACE VIEW "${escapedViewName}" AS
          SELECT * FROM read_parquet('${escapedUrl}')
        `);
      } finally {
        conn.closeSync();
      }

      instanceMap.set(key, instance);
    }
    return instanceMap.get(key)!;
  };

  return {
    async testConnection(config: unknown): Promise<void> {
      const parsed = ConfigSchema.parse(config);

      const testPromise = (async () => {
        const instance = await getInstance(parsed);
        const conn = await instance.connect();

        try {
          const resultReader = await conn.runAndReadAll(
            `SELECT 1 as test FROM "${VIEW_NAME}" LIMIT 1`,
          );
          await resultReader.readAll();
          context.logger?.info?.('s3: testConnection ok');
        } catch (error) {
          throw new Error(
            `Failed to connect to S3 Parquet data: ${error instanceof Error ? error.message : String(error)
            }`,
          );
        } finally {
          conn.closeSync();
        }
      })();

      await withTimeout(
        testPromise,
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `S3 connection test timed out after ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms. Please verify the credentials, region, endpoint and that the bucket/prefix contain valid Parquet files.`,
      );
    },

    async metadata(config: unknown): Promise<DatasourceMetadata> {
      const parsed = ConfigSchema.parse(config);
      let conn:
        | QueryEngineConnection
        | Awaited<ReturnType<Awaited<ReturnType<typeof getInstance>>['connect']>>;
      let shouldCloseConnection = false;

      const queryEngineConn = getQueryEngineConnection(context);
      if (queryEngineConn) {
        conn = queryEngineConn;
        await configureS3Connection(conn, parsed);

        const escapedUrl = escapeSingleQuotes(parsed.urlPattern);
        const escapedViewName = VIEW_NAME.replace(/"/g, '""');

        await conn.run(`
          CREATE OR REPLACE VIEW "${escapedViewName}" AS
          SELECT * FROM read_parquet('${escapedUrl}')
        `);
      } else {
        const instance = await getInstance(parsed);
        conn = await instance.connect();
        shouldCloseConnection = true;
      }

      try {
        const describeReader = await conn.runAndReadAll(
          `DESCRIBE "${VIEW_NAME}"`,
        );
        await describeReader.readAll();
        const describeRows = describeReader.getRowObjectsJS() as Array<{
          column_name: string;
          column_type: string;
          null: string;
        }>;

        const countReader = await conn.runAndReadAll(
          `SELECT COUNT(*) as count FROM "${VIEW_NAME}"`,
        );
        await countReader.readAll();
        const countRows = countReader.getRowObjectsJS() as Array<{
          count: bigint;
        }>;
        const rowCount = countRows[0]?.count ?? BigInt(0);

        const tableId = 1;
        const schemaName = 'main';

        const tables = [
          {
            id: tableId,
            schema: schemaName,
            name: VIEW_NAME,
            rls_enabled: false,
            rls_forced: false,
            bytes: 0,
            size: String(rowCount),
            live_rows_estimate: Number(rowCount),
            dead_rows_estimate: 0,
            comment: null,
            primary_keys: [],
            relationships: [],
          },
        ];

        const columnMetadata = describeRows.map((col, idx) => ({
          id: `${schemaName}.${VIEW_NAME}.${col.column_name}`,
          table_id: tableId,
          schema: schemaName,
          table: VIEW_NAME,
          name: col.column_name,
          ordinal_position: idx + 1,
          data_type: col.column_type,
          format: col.column_type,
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: col.null === 'YES',
          is_updatable: false,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        }));

        const schemas = [
          {
            id: 1,
            name: schemaName,
            owner: 'unknown',
          },
        ];

        return DatasourceMetadataZodSchema.parse({
          version: '0.0.1',
          driver: 's3.duckdb',
          schemas,
          tables,
          columns: columnMetadata,
        });
      } catch (error) {
        throw new Error(
          `Failed to fetch metadata: ${error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        if (
          shouldCloseConnection &&
          'closeSync' in conn &&
          typeof conn.closeSync === 'function'
        ) {
          conn.closeSync();
        }
      }
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const instance = await getInstance(parsed);
      const conn = await instance.connect();

      const startTime = performance.now();

      try {
        const resultReader = await conn.runAndReadAll(sql);
        await resultReader.readAll();
        const rows = resultReader.getRowObjectsJS() as Array<
          Record<string, unknown>
        >;
        const columnNames = resultReader.columnNames();

        const endTime = performance.now();

        const convertBigInt = (value: unknown): unknown => {
          if (typeof value === 'bigint') {
            if (
              value <= Number.MAX_SAFE_INTEGER &&
              value >= Number.MIN_SAFE_INTEGER
            ) {
              return Number(value);
            }
            return value.toString();
          }
          if (Array.isArray(value)) {
            return value.map(convertBigInt);
          }
          if (value && typeof value === 'object') {
            const converted: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(value)) {
              converted[key] = convertBigInt(val);
            }
            return converted;
          }
          return value;
        };

        const convertedRows = rows.map(
          (row) => convertBigInt(row) as Record<string, unknown>,
        );

        const columns = columnNames.map((name: string) => ({
          name,
          displayName: name,
          originalType: null,
        }));

        return {
          columns,
          rows: convertedRows,
          stat: {
            rowsAffected: 0,
            rowsRead: convertedRows.length,
            rowsWritten: 0,
            queryDurationMs: endTime - startTime,
          },
        };
      } catch (error) {
        throw new Error(
          `Query execution failed: ${error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        conn.closeSync();
      }
    },

    async close() {
      for (const instance of instanceMap.values()) {
        instance.closeSync();
      }
      instanceMap.clear();
      context.logger?.info?.('s3: closed');
    },
  };
}

export const driverFactory = makeS3ParquetDriver;
export default driverFactory;

