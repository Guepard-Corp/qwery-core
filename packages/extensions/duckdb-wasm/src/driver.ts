import * as duckdb from '@duckdb/duckdb-wasm';
import { z } from 'zod/v3';

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
} from '@qwery/extensions-sdk';

const ConfigSchema = z.object({
  database: z.string().default('playground').describe('Database name'),
});

type DriverConfig = z.infer<typeof ConfigSchema>;

interface DuckDBInstance {
  connection: duckdb.AsyncDuckDBConnection;
  db: duckdb.AsyncDuckDB;
}

export function makeDuckDBWasmDriver(context: DriverContext): IDataSourceDriver {
  const instanceMap = new Map<string, DuckDBInstance>();

  const getInstance = async (config: DriverConfig): Promise<DuckDBInstance> => {
    const key = config.database || 'playground';
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
    async testConnection(config: unknown): Promise<void> {
      const parsed = ConfigSchema.parse(config);
      await withTimeout(
        (async () => {
          const instance = await getInstance(parsed);
          await instance.connection.query('SELECT 1');
          context.logger?.info?.('duckdb-wasm: testConnection ok');
        })(),
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        'DuckDB WASM connection test timed out',
      );
    },

    async metadata(config: unknown): Promise<DatasourceMetadata> {
      const parsed = ConfigSchema.parse(config);
      const instance = await getInstance(parsed);

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

      let tableId = 1;
      const tableMap = new Map<
        string,
        {
          id: number;
          schema: string;
          name: string;
          columns: Array<ReturnType<typeof buildColumn>>;
        }
      >();

      const buildColumn = (
        schema: string,
        table: string,
        name: string,
        ordinal: number,
        dataType: string,
        nullable: string,
      ) => ({
        id: `${schema}.${table}.${name}`,
        table_id: 0,
        schema,
        table,
        name,
        ordinal_position: ordinal,
        data_type: dataType,
        format: dataType,
        is_identity: false,
        identity_generation: null,
        is_generated: false,
        is_nullable: nullable === 'YES',
        is_updatable: true,
        is_unique: false,
        check: null,
        default_value: null,
        enums: [],
        comment: null,
      });

      const rows = tablesResult.toArray() as Array<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        ordinal_position: number;
        is_nullable: string;
      }>;
      for (const row of rows) {
        const key = `${row.table_schema}.${row.table_name}`;
        if (!tableMap.has(key)) {
          tableMap.set(key, {
            id: tableId++,
            schema: row.table_schema,
            name: row.table_name,
            columns: [],
          });
        }
        const entry = tableMap.get(key)!;
        entry.columns.push(
          buildColumn(
            row.table_schema,
            row.table_name,
            row.column_name,
            row.ordinal_position,
            row.data_type,
            row.is_nullable,
          ),
        );
      }

      const tables = Array.from(tableMap.values()).map((table) => ({
        id: table.id,
        schema: table.schema,
        name: table.name,
        rls_enabled: false,
        rls_forced: false,
        bytes: 0,
        size: '0',
        live_rows_estimate: 0,
        dead_rows_estimate: 0,
        comment: null,
        primary_keys: [],
        relationships: [],
      }));

      const columns = Array.from(tableMap.values()).flatMap((table) =>
        table.columns.map((column) => ({
          ...column,
          table_id: table.id,
        })),
      );

      const schemas = Array.from(
        new Set(Array.from(tableMap.values()).map((table) => table.schema)),
      ).map((name, idx) => ({
        id: idx + 1,
        name,
        owner: 'unknown',
      }));

      return DatasourceMetadataZodSchema.parse({
        version: '0.0.1',
        driver: 'duckdb-wasm',
        schemas,
        tables,
        columns,
      });
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const instance = await getInstance(parsed);
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

