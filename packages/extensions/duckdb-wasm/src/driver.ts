import * as duckdb from '@duckdb/duckdb-wasm';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import {
  buildMetadataFromInformationSchema,
  withTimeout,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
} from '@qwery/extensions-sdk';

import { schema } from './schema';

interface DuckDBInstance {
  connection: duckdb.AsyncDuckDBConnection;
  db: duckdb.AsyncDuckDB;
}

export function makeDuckDBWasmDriver(context: DriverContext): IDataSourceDriver {
  const parsedConfig = schema.parse(context.config);
  const instanceMap = new Map<string, DuckDBInstance>();

  const getInstance = async (): Promise<DuckDBInstance> => {
    const key = parsedConfig.database || 'playground';
    if (!instanceMap.has(key)) {
      // Use local files instead of CDN
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/extensions/duckdb-wasm.default`
        : '/extensions/duckdb-wasm.default';
      
      // Create a local bundle configuration
      const localBundle = {
        mainModule: `${baseUrl}/duckdb-browser.mjs`,
        mainWorker: `${baseUrl}/duckdb-browser-eh.worker.js`,
        pthreadWorker: `${baseUrl}/duckdb-browser-coi.pthread.worker.js`,
      };

      const logger = new duckdb.ConsoleLogger();
      const worker = new Worker(localBundle.mainWorker);
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(localBundle.mainModule, localBundle.pthreadWorker);

      const connection = await db.connect();

      instanceMap.set(key, { connection, db });
    }
    return instanceMap.get(key)!;
  };

  return {
    async testConnection(): Promise<void> {
      await withTimeout(
        (async () => {
          const instance = await getInstance();
          await instance.connection.query('SELECT 1');
          context.logger?.info?.('duckdb-wasm: testConnection ok');
        })(),
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        'DuckDB WASM connection test timed out',
      );
    },

    async metadata(): Promise<DatasourceMetadata> {
      const instance = await getInstance();

      const tablesResult = await instance.connection.query(`
        SELECT 
          table_schema,
          table_name,
          column_name,
          data_type,
          ordinal_position,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_internal')
        ORDER BY table_schema, table_name, ordinal_position;
      `);

      const infoRows = tablesResult.toArray() as Array<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        ordinal_position: number;
        is_nullable: string;
      }>;

      return buildMetadataFromInformationSchema({
        driver: 'duckdb-wasm',
        rows: infoRows,
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const instance = await getInstance();
      const startTime = performance.now();

      try {
        const result = await instance.connection.query(sql);
        const endTime = performance.now();

        const schema = result.schema;
        const columns = schema.fields.map((field) => ({
          name: field.name,
          displayName: field.name,
          originalType: field.type?.toString() ?? null,
        }));

        const resultArray = result.toArray();
        const rows = resultArray.map((row) => {
          // Handle both array and object formats
          if (Array.isArray(row)) {
            const rowData: Record<string, unknown> = {};
            schema.fields.forEach((field, index) => {
              rowData[field.name] = row[index];
            });
            return rowData;
          }
          // If already an object, return as is
          return row as Record<string, unknown>;
        });

        return {
          columns,
          rows,
          stat: {
            rowsAffected: rows.length,
            rowsRead: rows.length,
            rowsWritten: 0,
            queryDurationMs: endTime - startTime,
          },
        };
      } catch (error) {
        throw new Error(
          `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },

    async close() {
      // Close all connections and databases
      for (const instance of instanceMap.values()) {
        await instance.connection.close();
        await instance.db.terminate();
      }
      instanceMap.clear();
      context.logger?.info?.('duckdb-wasm: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makeDuckDBWasmDriver;
export default driverFactory;

