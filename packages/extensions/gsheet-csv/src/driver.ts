import { performance } from 'node:perf_hooks';
import { z } from 'zod';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import { DatasourceMetadataZodSchema } from '@qwery/extensions-sdk';

const ConfigSchema = z.object({
  sharedLink: z.string().url().describe('Public Google Sheets shared link'),
});

type DriverConfig = z.infer<typeof ConfigSchema>;

const convertToCsvLink = (spreadsheetId: string, gid?: number): string => {
  // If gid is provided and valid, use it; otherwise, use no-gid export (first sheet)
  if (gid !== undefined && gid >= 0) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
};

async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
): Promise<Array<{ gid: number; name: string }>> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    const tabs: Array<{ gid: number; name: string }> = [];

    const regex = /"sheetId":(\d+),"title":"([^"]+)"/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      const gid = parseInt(m[1]!, 10);
      const name = m[2]!;
      if (!tabs.some((t) => t.gid === gid)) {
        tabs.push({ gid, name });
      }
    }

    return tabs;
  } catch (error) {
    return [];
  }
}

export function makeGSheetDriver(context: DriverContext): IDataSourceDriver {
  const instanceMap = new Map<
    string,
    {
      instance: Awaited<ReturnType<typeof createDuckDbInstance>>;
      tabs: Array<{ gid: number; name: string }>;
    }
  >();

  const createDuckDbInstance = async () => {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(':memory:', {
      access_mode: 'READ_WRITE',
      custom_user_agent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Install httpfs extension (only needs to be done once)
    const conn = await instance.connect();
    try {
      await conn.run('INSTALL httpfs');
      await conn.run('LOAD httpfs');
    } catch (error) {
      context.logger?.warn?.('Failed to install httpfs:', error);
    } finally {
      conn.closeSync();
    }

    return instance;
  };

  // Helper to ensure httpfs is loaded (custom_user_agent is set at instance creation time)
  const configureConnectionForHttp = async (conn: Awaited<ReturnType<Awaited<ReturnType<typeof createDuckDbInstance>>['connect']>>) => {
    try {
      await conn.run('LOAD httpfs');
    } catch (error) {
      context.logger?.warn?.('Failed to load httpfs:', error);
    }
  };

  const getInstance = async (config: DriverConfig) => {
    const key = config.sharedLink;
    if (!instanceMap.has(key)) {
      const match = key.match(
        /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      );
      if (!match) {
        throw new Error(`Invalid Google Sheets link format: ${key}`);
      }
      const spreadsheetId = match[1]!;

      const discoveredTabs = await fetchSpreadsheetMetadata(spreadsheetId);
      // If no tabs discovered, use no-gid export (first sheet) instead of assuming gid=0
      if (discoveredTabs.length === 0) {
        discoveredTabs.push({ gid: -1, name: 'Sheet1' });
      }

      const instance = await createDuckDbInstance();
      const conn = await instance.connect();

      // Configure HTTP settings for this connection
      await configureConnectionForHttp(conn);

      try {
        for (const tab of discoveredTabs) {
          const csvUrl = convertToCsvLink(spreadsheetId, tab.gid);
          const escapedUrl = csvUrl.replace(/'/g, "''");
          const escapedViewName = tab.name.replace(/"/g, '""');

          await conn.run(`
            CREATE OR REPLACE VIEW "${escapedViewName}" AS
            SELECT * FROM read_csv_auto('${escapedUrl}')
          `);
        }
      } finally {
        conn.closeSync();
      }

      instanceMap.set(key, { instance, tabs: discoveredTabs });
    }
    return instanceMap.get(key)!;
  };

  return {
    async testConnection(config: unknown): Promise<void> {
      const parsed = ConfigSchema.parse(config);
      const { instance, tabs } = await getInstance(parsed);
      const conn = await instance.connect();

      // Configure HTTP settings for this connection
      await configureConnectionForHttp(conn);

      try {
        const firstTab = tabs[0]!;
        const resultReader = await conn.runAndReadAll(
          `SELECT 1 as test FROM "${firstTab.name.replace(/"/g, '""')}" LIMIT 1`,
        );
        await resultReader.readAll();
        context.logger?.info?.('gsheet-csv: testConnection ok');
      } catch (error) {
        throw new Error(
          `Failed to connect to Google Sheet: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        conn.closeSync();
      }
    },

    async metadata(config: unknown): Promise<DatasourceMetadata> {
      const parsed = ConfigSchema.parse(config);
      const { instance, tabs: discoveredTabs } = await getInstance(parsed);
      const conn = await instance.connect();

      // Configure HTTP settings for this connection
      await configureConnectionForHttp(conn);

      try {
        const tables = [];
        const columnMetadata = [];
        const schemaName = 'main';

        for (let i = 0; i < discoveredTabs.length; i++) {
          const tab = discoveredTabs[i]!;
          const tableId = i + 1;
          const escapedViewName = tab.name.replace(/"/g, '""');

          // Get column information
          const describeReader = await conn.runAndReadAll(
            `DESCRIBE "${escapedViewName}"`,
          );
          await describeReader.readAll();
          const describeRows = describeReader.getRowObjectsJS() as Array<{
            column_name: string;
            column_type: string;
            null: string;
          }>;

          // Get row count
          const countReader = await conn.runAndReadAll(
            `SELECT COUNT(*) as count FROM "${escapedViewName}"`,
          );
          await countReader.readAll();
          const countRows = countReader.getRowObjectsJS() as Array<{
            count: bigint;
          }>;
          const rowCount = countRows[0]?.count ?? BigInt(0);

          tables.push({
            id: tableId,
            schema: schemaName,
            name: tab.name,
            rls_enabled: false,
            rls_forced: false,
            bytes: 0,
            size: String(rowCount),
            live_rows_estimate: Number(rowCount),
            dead_rows_estimate: 0,
            comment: null,
            primary_keys: [],
            relationships: [],
          });

          for (let idx = 0; idx < describeRows.length; idx++) {
            const col = describeRows[idx]!;
            columnMetadata.push({
              id: `${schemaName}.${tab.name}.${col.column_name}`,
              table_id: tableId,
              schema: schemaName,
              table: tab.name,
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
            });
          }
        }

        const schemas = [
          {
            id: 1,
            name: schemaName,
            owner: 'unknown',
          },
        ];

        return DatasourceMetadataZodSchema.parse({
          version: '0.0.1',
          driver: 'gsheet-csv.duckdb',
          schemas,
          tables,
          columns: columnMetadata,
        });
      } catch (error) {
        throw new Error(
          `Failed to fetch metadata: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        conn.closeSync();
      }
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const { instance } = await getInstance(parsed);
      const conn = await instance.connect();

      // Configure HTTP settings for this connection
      await configureConnectionForHttp(conn);

      const startTime = performance.now();

      try {
        const resultReader = await conn.runAndReadAll(sql);
        await resultReader.readAll();
        const rows = resultReader.getRowObjectsJS() as Array<
          Record<string, unknown>
        >;
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

    async close() {
      // Close all DuckDB instances
      for (const { instance } of instanceMap.values()) {
        instance.closeSync();
      }
      instanceMap.clear();
      context.logger?.info?.('gsheet-csv: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makeGSheetDriver;
export default driverFactory;

