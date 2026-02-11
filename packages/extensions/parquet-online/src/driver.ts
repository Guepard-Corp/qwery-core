import { performance } from 'node:perf_hooks';

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

import { schema } from './schema';

const VIEW_NAME = 'data';

export function makeParquetDriver(context: DriverContext): IDataSourceDriver {
  const parsedConfig = schema.parse(context.config);
  const instanceMap = new Map<string, Awaited<ReturnType<typeof createDuckDbInstance>>>();

  const createDuckDbInstance = async () => {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(':memory:');
    return instance;
  };

  const getInstance = async () => {
    const key = parsedConfig.url;
    if (!instanceMap.has(key)) {
      const instance = await createDuckDbInstance();
      const conn = await instance.connect();

      try {
        // Ensure HTTP/HTTPS access is available for remote Parquet URLs
        await conn.run('INSTALL httpfs;');
        await conn.run('LOAD httpfs;');

        const escapedUrl = parsedConfig.url.replace(/'/g, "''");
        const escapedViewName = VIEW_NAME.replace(/"/g, '""');

        // Create view from Parquet URL using read_parquet
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
    async testConnection(): Promise<void> {
      const testPromise = (async () => {
        const instance = await getInstance();
        const conn = await instance.connect();

        try {
          // Test by querying the view
          const resultReader = await conn.runAndReadAll(
            `SELECT 1 as test FROM "${VIEW_NAME}" LIMIT 1`,
          );
          await resultReader.readAll();
          context.logger?.info?.('parquet-online: testConnection ok');
        } catch (error) {
          throw new Error(
            `Failed to connect to Parquet URL: ${error instanceof Error ? error.message : String(error)}`,
          );
        } finally {
          conn.closeSync();
        }
      })();

      await withTimeout(
        testPromise,
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `Parquet connection test timed out after ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms. Please verify the URL is accessible and points to a valid Parquet file.`,
      );
    },

    async metadata(): Promise<DatasourceMetadata> {
      let conn: QueryEngineConnection | Awaited<ReturnType<Awaited<ReturnType<typeof getInstance>>['connect']>>;
      let shouldCloseConnection = false;

      const queryEngineConn = getQueryEngineConnection(context);
      if (queryEngineConn) {
        // Use provided connection - create view in main engine
        conn = queryEngineConn;
        const escapedUrl = parsedConfig.url.replace(/'/g, "''");
        const escapedViewName = VIEW_NAME.replace(/"/g, '""');

        // Create view from Parquet URL using read_parquet in main engine
        await conn.run(`
          CREATE OR REPLACE VIEW "${escapedViewName}" AS
          SELECT * FROM read_parquet('${escapedUrl}')
        `);
      } else {
        // Fallback for testConnection or when no connection provided - create temporary instance
        const instance = await getInstance();
        conn = await instance.connect();
        shouldCloseConnection = true;
      }

      try {
        // Get column information from the view using DESCRIBE
        const describeReader = await conn.runAndReadAll(`DESCRIBE "${VIEW_NAME}"`);
        await describeReader.readAll();
        const describeRows = describeReader.getRowObjectsJS() as Array<{
          column_name: string;
          column_type: string;
          null: string;
        }>;

        // Get row count for table size estimate
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

        const schemas = [
          {
            id: 1,
            name: schemaName,
            owner: 'unknown',
          },
        ];

        return DatasourceMetadataZodSchema.parse({
          version: '0.0.1',
          driver: 'parquet-online.duckdb',
          schemas,
          tables,
          columns: columnMetadata,
        });
      } catch (error) {
        throw new Error(
          `Failed to fetch metadata: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        if (shouldCloseConnection && 'closeSync' in conn && typeof conn.closeSync === 'function') {
          conn.closeSync();
        }
      }
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const instance = await getInstance();
      const conn = await instance.connect();

      const startTime = performance.now();

      try {
        const resultReader = await conn.runAndReadAll(sql);
        await resultReader.readAll();
        const rows = resultReader.getRowObjectsJS() as Array<Record<string, unknown>>;
        const columnNames = resultReader.columnNames();

        const endTime = performance.now();

        // Convert BigInt values to numbers/strings for JSON serialization
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
          `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        conn.closeSync();
      }
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error(
          'parquet-online attach requires queryEngineConnection in DriverContext',
        );
      }
      const url = parsedConfig.url;
      if (!url) {
        throw new Error(
          'parquet-online attach requires url or connectionUrl in config',
        );
      }

      await conn.run('INSTALL httpfs;');
      await conn.run('LOAD httpfs;');

      const catalogName = options.schemaName ?? 'main';
      const escapedCatalog = catalogName.replace(/"/g, '""');
      const escapedCatalogForQuery = catalogName.replace(/'/g, "''");

      // Use ATTACH to create a catalog (matches DuckDBNativeAttachmentStrategy and query path resolution)
      // DuckDB resolves "catalog.table" as catalog; CREATE SCHEMA makes a schema, not a catalog
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

      const escapedViewName = VIEW_NAME.replace(/"/g, '""');
      const escapedUrl = url.replace(/'/g, "''");
      await conn.run(`
        CREATE OR REPLACE VIEW "${escapedCatalog}"."${escapedViewName}" AS
        SELECT * FROM read_parquet('${escapedUrl}')
      `);

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
          'parquet-online detach requires queryEngineConnection in DriverContext',
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
        // Catalog may already be detached (e.g. double detach)
      }
    },

    async close() {
      // Close all DuckDB instances
      for (const instance of instanceMap.values()) {
        instance.closeSync();
      }
      instanceMap.clear();
      context.logger?.info?.('parquet-online: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makeParquetDriver;
export default driverFactory;

