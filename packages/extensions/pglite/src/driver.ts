import { PGlite } from '@electric-sql/pglite';
import { z } from 'zod';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import { DatasourceMetadataZodSchema } from '@qwery/extensions-sdk';

const ConfigSchema = z.object({
  database: z.string().default('playground').describe('Database name'),
});

type DriverConfig = z.infer<typeof ConfigSchema>;

export function makePGliteDriver(context: DriverContext): IDataSourceDriver {
  const dbMap = new Map<string, PGlite>();

  const getDb = async (config: DriverConfig): Promise<PGlite> => {
    const key = config.database || 'playground';
    if (!dbMap.has(key)) {
      const db = new PGlite(`idb://${key}`);
      await db.waitReady;
      dbMap.set(key, db);
    }
    return dbMap.get(key)!;
  };

  return {
    async testConnection(config: unknown): Promise<void> {
      const parsed = ConfigSchema.parse(config);
      const db = await getDb(parsed);
      await db.query('SELECT 1');
      context.logger?.info?.('pglite: testConnection ok');
    },

    async metadata(config: unknown): Promise<DatasourceMetadata> {
      const parsed = ConfigSchema.parse(config);
      const db = await getDb(parsed);

      const tablesResult = await db.query<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        ordinal_position: number;
        is_nullable: string;
        character_maximum_length: number | null;
        numeric_precision: number | null;
        numeric_scale: number | null;
      }>(`
        SELECT 
          table_schema,
          table_name,
          column_name,
          data_type,
          ordinal_position,
          is_nullable,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
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
        charMaxLength: number | null,
        numericPrecision: number | null,
        numericScale: number | null,
      ) => {
        let format = dataType;
        if (charMaxLength) {
          format = `${dataType}(${charMaxLength})`;
        } else if (numericPrecision !== null && numericScale !== null) {
          format = `${dataType}(${numericPrecision},${numericScale})`;
        } else if (numericPrecision !== null) {
          format = `${dataType}(${numericPrecision})`;
        }

        return {
          id: `${schema}.${table}.${name}`,
          table_id: 0,
          schema,
          table,
          name,
          ordinal_position: ordinal,
          data_type: dataType,
          format,
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
        };
      };

      for (const row of tablesResult.rows) {
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
            row.character_maximum_length,
            row.numeric_precision,
            row.numeric_scale,
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
        driver: 'pglite',
        schemas,
        tables,
        columns,
      });
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const db = await getDb(parsed);
      const startTime = performance.now();

      try {
        const result = await db.query(sql);
        const endTime = performance.now();

        const columns = result.fields.map((field: { name: string; dataTypeID?: number }) => ({
          name: field.name,
          displayName: field.name,
          originalType: field.dataTypeID?.toString() ?? null,
        }));

        const rows = result.rows.map((row: unknown) => {
          if (Array.isArray(row)) {
            const rowData: Record<string, unknown> = {};
            result.fields.forEach((field: { name: string }, index: number) => {
              rowData[field.name] = row[index];
            });
            return rowData;
          }
          return row as Record<string, unknown>;
        });

        return {
          columns,
          rows,
          stat: {
            rowsAffected: result.affectedRows ?? 0,
            rowsRead: rows.length,
            rowsWritten: result.affectedRows ?? 0,
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
      // Close all databases
      for (const db of dbMap.values()) {
        await db.close();
      }
      dbMap.clear();
      context.logger?.info?.('pglite: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makePGliteDriver;
export default driverFactory;

