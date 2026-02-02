import { performance } from 'node:perf_hooks';
import { z } from 'zod/v3';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
  DriverAttachOptions,
  DriverAttachResult,
  DriverDetachOptions,
} from '@qwery/extensions-sdk';
import {
  DatasourceMetadataZodSchema,
  withTimeout,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  getQueryEngineConnection,
  type QueryEngineConnection,
} from '@qwery/extensions-sdk';

const PROVIDERS = ['aws', 'digitalocean', 'minio', 'other'] as const;
const FORMATS = ['parquet', 'json'] as const;

const ConfigSchema = z
  .object({
    provider: z.enum(PROVIDERS),
    aws_access_key_id: z.string().min(1),
    aws_secret_access_key: z.string().min(1),
    aws_session_token: z.string().optional(),
    region: z.string().min(1),
    endpoint_url: z.string().url().optional(),
    bucket: z.string().min(1),
    prefix: z.string().optional().default(''),
    format: z.enum(FORMATS),
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.provider === 'aws' ||
      (data.endpoint_url && data.endpoint_url.length > 0) ||
      (data.provider === 'digitalocean' && data.region?.length > 0),
    {
      message:
        'Endpoint URL required for non-AWS, or set region for DigitalOcean',
      path: ['endpoint_url'],
    },
  )
  .transform((data) => {
    const trimmedPrefix = (data.prefix ?? '').replace(/^\/+|\/+$/g, '');
    const includes = data.includes ?? [];
    const defaultGlob =
      data.format === 'parquet' ? '**/*.parquet' : '**/*.json';
    const includeGlob =
      includes.length > 0 ? (includes[0] ?? defaultGlob).replace(/^\/+/, '') : defaultGlob;
    const pathPart = trimmedPrefix ? `${trimmedPrefix}/${includeGlob}` : includeGlob;
    const urlPattern = `s3://${data.bucket}/${pathPart}`;
    const endpointUrl =
      data.endpoint_url?.trim() ||
      (data.provider === 'digitalocean' && data.region
        ? `https://${data.region}.digitaloceanspaces.com`
        : undefined);
    const cacheKey = `${data.provider}|${data.region}|${endpointUrl ?? ''}|${data.aws_session_token ?? ''}|${data.bucket}|${trimmedPrefix}|${data.format}|${includeGlob}`;
    return {
      ...data,
      endpoint_url: endpointUrl,
      prefix: trimmedPrefix,
      includeGlob,
      urlPattern,
      cacheKey,
    };
  });

type DriverConfig = z.infer<typeof ConfigSchema>;

const VIEW_NAME = 'data';

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

type S3ConfigurableConnection = { run: (sql: string) => Promise<unknown> };

const S3_SECRET_NAME = 's3_qwery';

async function configureS3Connection(
  conn: S3ConfigurableConnection,
  config: DriverConfig,
): Promise<void> {
  await conn.run('INSTALL httpfs;');
  await conn.run('LOAD httpfs;');
  const keyId = escapeSingleQuotes(config.aws_access_key_id);
  const secret = escapeSingleQuotes(config.aws_secret_access_key);
  const region = escapeSingleQuotes(config.region);
  const sessionToken = config.aws_session_token?.trim()
    ? escapeSingleQuotes(config.aws_session_token.trim())
    : null;
  const endpointRaw = config.endpoint_url?.trim();
  let endpointHost: string | null = endpointRaw
    ? endpointRaw.replace(/^https?:\/\//, '').split('/')[0] ?? null
    : null;
  if (endpointHost && config.provider === 'digitalocean') {
    const parts = endpointHost.split('.');
    if (
      parts.length === 4 &&
      parts[2] === 'digitaloceanspaces' &&
      parts[3] === 'com'
    ) {
      endpointHost = parts.slice(1).join('.');
    }
  }
  if (endpointHost) endpointHost = escapeSingleQuotes(endpointHost);
  const isDigitalOcean = config.provider === 'digitalocean';
  const parts = [
    `TYPE s3`,
    `PROVIDER config`,
    `KEY_ID '${keyId}'`,
    `SECRET '${secret}'`,
    `REGION '${region}'`,
  ];
  if (sessionToken) parts.push(`SESSION_TOKEN '${sessionToken}'`);
  if (endpointHost) {
    parts.push(`ENDPOINT '${endpointHost}'`);
    parts.push(`URL_STYLE '${isDigitalOcean ? 'vhost' : 'path'}'`);
  }
  await conn.run(
    `CREATE OR REPLACE SECRET ${S3_SECRET_NAME} (${parts.join(', ')});`,
  );
}

function buildViewSql(config: DriverConfig): string {
  const escapedUrl = escapeSingleQuotes(config.urlPattern);
  const escapedViewName = VIEW_NAME.replace(/"/g, '""');
  if (config.format === 'parquet') {
    return `CREATE OR REPLACE VIEW "${escapedViewName}" AS SELECT * FROM read_parquet('${escapedUrl}')`;
  }
  return `CREATE OR REPLACE VIEW "${escapedViewName}" AS SELECT * FROM read_json_auto('${escapedUrl}')`;
}

function buildViewSqlInCatalog(config: DriverConfig, catalogName: string): string {
  const escapedUrl = escapeSingleQuotes(config.urlPattern);
  const escapedCatalog = catalogName.replace(/"/g, '""');
  const escapedViewName = VIEW_NAME.replace(/"/g, '""');
  if (config.format === 'parquet') {
    return `CREATE OR REPLACE VIEW "${escapedCatalog}"."${escapedViewName}" AS SELECT * FROM read_parquet('${escapedUrl}')`;
  }
  return `CREATE OR REPLACE VIEW "${escapedCatalog}"."${escapedViewName}" AS SELECT * FROM read_json_auto('${escapedUrl}')`;
}

export function makeS3Driver(context: DriverContext): IDataSourceDriver {
  const instanceMap = new Map<
    string,
    Awaited<ReturnType<typeof createDuckDbInstance>>
  >();

  const createDuckDbInstance = async () => {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    return DuckDBInstance.create(':memory:');
  };

  const getInstance = async (config: DriverConfig) => {
    const key = config.cacheKey;
    if (!instanceMap.has(key)) {
      const instance = await createDuckDbInstance();
      const conn = await instance.connect();
      try {
        await configureS3Connection(conn, config);
        await conn.run(buildViewSql(config));
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
            `Failed to connect to S3: ${error instanceof Error ? error.message : String(error)}`,
          );
        } finally {
          conn.closeSync();
        }
      })();
      await withTimeout(
        testPromise,
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `S3 connection test timed out. Check credentials, region, endpoint (if non-AWS), bucket, and that matching ${parsed.format} files exist.`,
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
        await conn.run(buildViewSql(parsed));
      } else {
        const instance = await getInstance(parsed);
        conn = await instance.connect();
        shouldCloseConnection = true;
      }

      try {
        const describeReader = await conn.runAndReadAll(`DESCRIBE "${VIEW_NAME}"`);
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
        const countRows = countReader.getRowObjectsJS() as Array<{ count: bigint }>;
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
        const schemas = [{ id: 1, name: schemaName, owner: 'unknown' }];
        return DatasourceMetadataZodSchema.parse({
          version: '0.0.1',
          driver: 's3.duckdb',
          schemas,
          tables,
          columns: columnMetadata,
        });
      } catch (error) {
        throw new Error(
          `Failed to fetch metadata: ${error instanceof Error ? error.message : String(error)}`,
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
        const rows = resultReader.getRowObjectsJS() as Array<Record<string, unknown>>;
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
          if (Array.isArray(value)) return value.map(convertBigInt);
          if (value && typeof value === 'object') {
            const converted: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) converted[k] = convertBigInt(v);
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
          `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        conn.closeSync();
      }
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error(
          's3 attach requires queryEngineConnection in DriverContext',
        );
      }
      const parsed = ConfigSchema.parse(options.config) as DriverConfig;
      const catalogName = options.schemaName ?? 'main';
      const escapedCatalog = catalogName.replace(/"/g, '""');
      const escapedCatalogForQuery = catalogName.replace(/'/g, "''");

      await configureS3Connection(conn, parsed);

      const dbListReader = await conn.runAndReadAll(
        `SELECT name FROM pragma_database_list WHERE name = '${escapedCatalogForQuery}'`,
      );
      await dbListReader.readAll();
      const existingDbs = dbListReader.getRowObjectsJS() as Array<{
        name: string;
      }>;
      if (existingDbs.length === 0) {
        await conn.run(`ATTACH ':memory:' AS "${escapedCatalog}"`);
      }

      await conn.run(buildViewSqlInCatalog(parsed, catalogName));

      return {
        tables: [
          {
            schema: catalogName,
            table: VIEW_NAME,
            path: `${catalogName}.${VIEW_NAME}`,
          },
        ],
      };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error(
          's3 detach requires queryEngineConnection in DriverContext',
        );
      }
      const catalogName = options.schemaName ?? 'main';
      const escapedCatalog = catalogName.replace(/"/g, '""');
      const tableNames = options.tableNames ?? [VIEW_NAME];
      for (const table of tableNames) {
        const escapedTable = table.replace(/"/g, '""');
        await conn.run(
          `DROP VIEW IF EXISTS "${escapedCatalog}"."${escapedTable}"`,
        );
      }
      try {
        await conn.run(`DETACH "${escapedCatalog}"`);
      } catch {
        // Catalog may already be detached
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

export { makeS3Driver as driverFactory, makeS3Driver as default };
