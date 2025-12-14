import * as duckdb from '@duckdb/node-api';
import { z } from 'zod';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import { DatasourceMetadataZodSchema } from '@qwery/extensions-sdk';

const ConfigSchema = z.object({
  database: z.string().default(':memory:').describe('Database path (use :memory: for in-memory)'),
});

type DriverConfig = z.infer<typeof ConfigSchema>;

interface DuckDBInstance {
  instance: duckdb.DuckDBInstance;
  connection: duckdb.DuckDBConnection;
}

export function makeDuckDBDriver(context: DriverContext): IDataSourceDriver {
  const instanceMap = new Map<string, DuckDBInstance>();

  const getInstance = async (config: DriverConfig): Promise<DuckDBInstance> => {
    const key = config.database || ':memory:';
    if (!instanceMap.has(key)) {
      const instance = await duckdb.DuckDBInstance.create(
        key === ':memory:' ? undefined : key,
      );
      const connection = await instance.connect();
      instanceMap.set(key, { instance, connection });
    }
    return instanceMap.get(key)!;
  };

  return {
    async testConnection(config: unknown): Promise<void> {
      const parsed = ConfigSchema.parse(config);
      const { connection } = await getInstance(parsed);
      await connection.run('SELECT 1');
      context.logger?.info?.('duckdb: testConnection ok');
    },

    async metadata(config: unknown): Promise<DatasourceMetadata> {
      const parsed = ConfigSchema.parse(config);
      const { connection } = await getInstance(parsed);

      const result = await connection.run(`
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

      const tablesResult = await result.getRowObjectsJS() as Array<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        ordinal_position: number;
        is_nullable: string;
      }>;

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

      for (const row of tablesResult) {
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
        driver: 'duckdb',
        schemas,
        tables,
        columns,
      });
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const { connection } = await getInstance(parsed);
      const startTime = Date.now();

      try {
        const result = await connection.run(sql);
        const endTime = Date.now();

        const columnNames = result.columnNames();
        const columnTypes = result.columnTypes();
        const columns = columnNames.map((name, index) => ({
          name,
          displayName: name,
          originalType: columnTypes[index]?.toString() ?? null,
        }));

        const rows = await result.getRowObjectsJS() as Array<Record<string, unknown>>;

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
      // Close all connections and instances
      for (const { connection, instance } of instanceMap.values()) {
        connection.closeSync();
        instance.closeSync();
      }
      instanceMap.clear();
      context.logger?.info?.('duckdb: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makeDuckDBDriver;
export default driverFactory;
