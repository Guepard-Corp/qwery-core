import { PGlite } from '@electric-sql/pglite';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import { buildMetadataFromInformationSchema } from '@qwery/extensions-sdk';

import { schema } from './schema';

export function makePGliteDriver(context: DriverContext): IDataSourceDriver {
  const parsedConfig = schema.parse(context.config);
  const dbMap = new Map<string, PGlite>();

  const getDb = async (): Promise<PGlite> => {
    const key = parsedConfig.database || 'playground';
    if (!dbMap.has(key)) {
      const db = new PGlite(`idb://${key}`);
      await db.waitReady;
      dbMap.set(key, db);
    }
    return dbMap.get(key)!;
  };

  return {
    async testConnection(): Promise<void> {
      const db = await getDb();
      await db.query('SELECT 1');
      context.logger?.info?.('pglite: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const db = await getDb();

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

      const infoRows = tablesResult.rows.map((row) => ({
        table_schema: row.table_schema,
        table_name: row.table_name,
        column_name: row.column_name,
        data_type: row.data_type,
        ordinal_position: row.ordinal_position,
        is_nullable: row.is_nullable,
      }));

      return buildMetadataFromInformationSchema({
        driver: 'pglite',
        rows: infoRows,
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const db = await getDb();
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

