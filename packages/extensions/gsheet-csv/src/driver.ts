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
  isQueryEngineConnection,
  type QueryEngineConnection,
} from '@qwery/extensions-sdk';

const ConfigSchema = z.object({
  sharedLink: z.string().url().describe('Public Google Sheets shared link'),
});

type DriverConfig = z.infer<typeof ConfigSchema>;

const convertToCsvLink = (spreadsheetId: string, gid: number = 0): string => {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
};

async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
): Promise<Array<{ gid: number; name: string }>> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONNECTION_TEST_TIMEOUT_MS);
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        // Add headers to help with CORS if needed
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Qwery/1.0)',
        },
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(
          `Failed to fetch spreadsheet metadata: HTTP ${response.status} ${response.statusText}. Make sure the sheet is publicly accessible.`,
        );
      }

      const html = await response.text();
      
      // Check if we got a valid HTML response
      if (!html || html.length < 100) {
        throw new Error(
          'Received invalid response from Google Sheets. The sheet might not be publicly accessible or the URL is incorrect.',
        );
      }

      const tabs: Array<{ gid: number; name: string }> = [];

      // Try multiple regex patterns to find sheet metadata
      const patterns = [
        /"sheetId":(\d+),"title":"([^"]+)"/g,
        /"sheetId":(\d+),.*?"title":"([^"]+)"/g,
        /sheetId["\s]*:["\s]*(\d+).*?title["\s]*:["\s]*"([^"]+)"/g,
      ];

      for (const regex of patterns) {
        let m;
        while ((m = regex.exec(html)) !== null) {
          const gid = parseInt(m[1]!, 10);
          const name = m[2]!;
          if (!tabs.some((t) => t.gid === gid)) {
            tabs.push({ gid, name });
          }
        }
        if (tabs.length > 0) break;
      }

      return tabs;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            `Timeout while fetching Google Sheet metadata after ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms. Please verify the sheet URL is correct and the sheet is publicly accessible.`,
          );
        }
        if (error.message.includes('fetch')) {
          throw new Error(
            `Failed to fetch Google Sheet: ${error.message}. This might be due to CORS restrictions or the sheet not being publicly accessible. Please ensure the sheet is shared with "Anyone with the link" permission.`,
          );
        }
        throw error;
      }
      throw new Error(`Unknown error while fetching Google Sheet metadata: ${String(error)}`);
    }
  } catch (error) {
    // Re-throw with better context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch spreadsheet metadata: ${String(error)}`);
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
    const instance = await DuckDBInstance.create(':memory:');
    return instance;
  };

  const getInstance = async (config: DriverConfig) => {
    const key = config.sharedLink;
    if (!instanceMap.has(key)) {
      // Extract spreadsheet ID from various Google Sheets URL formats:
      // - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
      // - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit?gid=0#gid=0
      // - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID
      const match = key.match(
        /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      );
      if (!match) {
        throw new Error(
          `Invalid Google Sheets link format: ${key}. Expected format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...`,
        );
      }
      const spreadsheetId = match[1]!;

      const discoveredTabs = await fetchSpreadsheetMetadata(spreadsheetId);
      // Always ensure at least gid 0 if nothing discovered
      if (discoveredTabs.length === 0) {
        discoveredTabs.push({ gid: 0, name: 'sheet' });
      }

      const instance = await createDuckDbInstance();
      const conn = await instance.connect();

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
      
      const testPromise = (async () => {
        const { instance, tabs } = await getInstance(parsed);
        const conn = await instance.connect();

        try {
          if (tabs.length === 0) {
            throw new Error('No sheets found in the Google Spreadsheet');
          }
          
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
      })();

      await withTimeout(
        testPromise,
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `Google Sheet connection test timed out after ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms. Please verify the shared link is valid and the sheet is publicly accessible.`,
      );
    },

    async metadata(
      config: unknown,
      connection?: unknown,
    ): Promise<DatasourceMetadata> {
      const parsed = ConfigSchema.parse(config);
      let conn: QueryEngineConnection | Awaited<ReturnType<Awaited<ReturnType<typeof getInstance>>['instance']['connect']>>;
      let shouldCloseConnection = false;
      let discoveredTabs: Array<{ gid: number; name: string }>;

      // Check if connection parameter is provided, otherwise use queryEngineConnection from context
      const queryEngineConn =
        (connection && isQueryEngineConnection(connection)
          ? connection
          : null) || getQueryEngineConnection(context);

      if (queryEngineConn) {
        // Use provided connection - create views in main engine
        conn = queryEngineConn;
        const match = parsed.sharedLink.match(
          /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        );
        if (!match) {
          throw new Error(`Invalid Google Sheets link format: ${parsed.sharedLink}`);
        }
        const spreadsheetId = match[1]!;
        discoveredTabs = await fetchSpreadsheetMetadata(spreadsheetId);
        if (discoveredTabs.length === 0) {
          discoveredTabs.push({ gid: 0, name: 'sheet' });
        }

        // Create views in main engine connection
        for (const tab of discoveredTabs) {
          const csvUrl = convertToCsvLink(spreadsheetId, tab.gid);
          const escapedUrl = csvUrl.replace(/'/g, "''");
          const escapedViewName = tab.name.replace(/"/g, '""');

          await conn.run(`
            CREATE OR REPLACE VIEW "${escapedViewName}" AS
            SELECT * FROM read_csv_auto('${escapedUrl}')
          `);
        }
      } else {
        // Fallback for testConnection or when no connection provided - create temporary instance
        const { instance, tabs } = await getInstance(parsed);
        discoveredTabs = tabs;
        conn = await instance.connect();
        shouldCloseConnection = true;
      }

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
        if (shouldCloseConnection && 'closeSync' in conn && typeof conn.closeSync === 'function') {
          conn.closeSync();
        }
      }
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const { instance } = await getInstance(parsed);
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

