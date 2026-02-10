import { performance } from 'node:perf_hooks';
import { z } from 'zod';

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
  isQueryEngineConnection,
  type QueryEngineConnection,
} from '@qwery/extensions-sdk';

const ConfigSchema = z.object({
  sharedLink: z.string().url().describe('Public Google Sheets shared link'),
});

type DriverConfig = z.infer<typeof ConfigSchema>;

const convertToCsvLink = (spreadsheetId: string, gid: number): string => {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  return gid === 0 ? base : `${base}&gid=${gid}`;
};

const extractSpreadsheetId = (url: string): string | null => {
  const match = url.match(
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
  );
  return match?.[1] ?? null;
};

/** Fetch all tab metadata (gid + name) from spreadsheet HTML */
const fetchSpreadsheetMetadata = async (
  spreadsheetId: string,
): Promise<Array<{ gid: number; name: string }>> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Qwery/1.0)' },
    });
    if (!response.ok) return [];
    const html = await response.text();
    const tabs: Array<{ gid: number; name: string }> = [];
    const regex = /"sheetId":(\d+),"title":"([^"]+)"/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      const gid = parseInt(m[1]!, 10);
      const name = m[2]!;
      if (!tabs.some((t) => t.gid === gid)) tabs.push({ gid, name });
    }
    return tabs;
  } catch {
    return [];
  }
};

const extractGidsFromUrl = (url: string): number[] => {
  const gids: number[] = [];
  const queryMatch = url.match(/[?&]gid=(\d+)/);
  if (queryMatch?.[1]) {
    const gid = parseInt(queryMatch[1], 10);
    if (!isNaN(gid)) gids.push(gid);
  }
  const hashMatch = url.match(/#gid=(\d+)/);
  if (hashMatch?.[1]) {
    const gid = parseInt(hashMatch[1], 10);
    if (!isNaN(gid) && !gids.includes(gid)) gids.push(gid);
  }
  return gids;
};

const sanitizeTableName = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return /^\d/.test(cleaned) ? `v_${cleaned}` : cleaned;
};

/**
 * Extracts the gid (sheet ID) from a Google Sheets URL if present.
 * Supports both query parameter (?gid=) and hash fragment (#gid=) formats.
 * @param url - The Google Sheets URL
 * @returns The gid as a number, or null if not found
 */
const extractGidFromUrl = (url: string): number | null => {
  // Try to extract from query parameter: ?gid=1822465437
  const queryMatch = url.match(/[?&]gid=(\d+)/);
  if (queryMatch) {
    return parseInt(queryMatch[1]!, 10);
  }

  // Try to extract from hash fragment: #gid=1822465437
  const hashMatch = url.match(/#gid=(\d+)/);
  if (hashMatch) {
    return parseInt(hashMatch[1]!, 10);
  }

  return null;
};

/**
 * Discovers the first available gid from a Google Sheets spreadsheet.
 * @param spreadsheetId - The spreadsheet ID
 * @returns The first gid found, or null if none found
 */
const discoverFirstGid = async (spreadsheetId: string): Promise<number | null> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONNECTION_TEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Qwery/1.0)',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const html = await response.text();

      if (!html || html.length < 100) {
        return null;
      }

      // Try to find gid from grid-container div ID (most reliable)
      // Pattern: id="1822465437-grid-container"
      const gridContainerMatch = html.match(/id="(\d+)-grid-container"/);
      if (gridContainerMatch) {
        const gid = parseInt(gridContainerMatch[1]!, 10);
        if (!isNaN(gid)) {
          return gid;
        }
      }

      // Fallback: Try to find sheetId in JSON format
      const patterns = [
        /"sheetId":(\d+)/,
        /'sheetId':(\d+)/,
        /sheetId["\s]*:["\s]*(\d+)/,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const gid = parseInt(match[1]!, 10);
          if (!isNaN(gid)) {
            return gid;
          }
        }
      }

      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      return null;
    }
  } catch (error) {
    return null;
  }
};

export function makeGSheetDriver(context: DriverContext): IDataSourceDriver {
  const parsedConfig = ConfigSchema.parse(context.config);
  const instanceMap = new Map<
    string,
    {
      instance: Awaited<ReturnType<typeof createDuckDbInstance>>;
      gid: number;
    }
  >();

  const createDuckDbInstance = async () => {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(':memory:');
    return instance;
  };

  const getInstance = async () => {
    const key = parsedConfig.sharedLink;
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
      let gid = extractGidFromUrl(key);

      // If no gid in URL, try to discover the first available gid
      if (gid === null) {
        gid = await discoverFirstGid(spreadsheetId);
        // If discovery failed, default to 0
        if (gid === null) {
          gid = 0;
        }
      }

      const instance = await createDuckDbInstance();
      const conn = await instance.connect();

      try {
        const csvUrl = convertToCsvLink(spreadsheetId, gid);
        const escapedUrl = csvUrl.replace(/'/g, "''");

        await conn.run(`
          CREATE OR REPLACE VIEW "sheet" AS
          SELECT * FROM read_csv_auto('${escapedUrl}')
        `);
      } catch (error) {
        throw new Error(
          `Failed to load Google Sheet: ${error instanceof Error ? error.message : String(error)}. Please ensure the sheet is publicly accessible and the URL is correct. If the sheet has multiple tabs, include the gid parameter in the URL (e.g., ?gid=1822465437).`,
        );
      } finally {
        conn.closeSync();
      }

      instanceMap.set(key, { instance, gid });
    }
    return instanceMap.get(key)!;
  };

  return {
    async testConnection(): Promise<void> {
      const testPromise = (async () => {
        const { instance } = await getInstance();
        const conn = await instance.connect();

        try {
          const resultReader = await conn.runAndReadAll(
            `SELECT 1 as test FROM "sheet" LIMIT 1`,
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

    async metadata(): Promise<DatasourceMetadata> {
      let conn: QueryEngineConnection | Awaited<ReturnType<Awaited<ReturnType<typeof getInstance>>['instance']['connect']>>;
      let shouldCloseConnection = false;

      // Use queryEngineConnection from context
      const queryEngineConn = getQueryEngineConnection(context);

      if (queryEngineConn) {
        // Use provided connection - create view in main engine
        conn = queryEngineConn;
        const match = parsedConfig.sharedLink.match(
          /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        );
        if (!match) {
          throw new Error(`Invalid Google Sheets link format: ${parsedConfig.sharedLink}`);
        }
        const spreadsheetId = match[1]!;
        let gid = extractGidFromUrl(parsedConfig.sharedLink);

        // If no gid in URL, try to discover the first available gid
        if (gid === null) {
          gid = await discoverFirstGid(spreadsheetId);
          // If discovery failed, default to 0
          if (gid === null) {
            gid = 0;
          }
        }

        // Create view in main engine connection
        const csvUrl = convertToCsvLink(spreadsheetId, gid);
        const escapedUrl = csvUrl.replace(/'/g, "''");

        try {
          await conn.run(`
            CREATE OR REPLACE VIEW "sheet" AS
            SELECT * FROM read_csv_auto('${escapedUrl}')
          `);
        } catch (error) {
          throw new Error(
            `Failed to load Google Sheet: ${error instanceof Error ? error.message : String(error)}. Please ensure the sheet is publicly accessible and the URL is correct. If the sheet has multiple tabs, include the gid parameter in the URL (e.g., ?gid=1822465437).`,
          );
        }
      } else {
        // Fallback for testConnection or when no connection provided - create temporary instance
        const { instance } = await getInstance();
        conn = await instance.connect();
        shouldCloseConnection = true;
      }

      try {
        const tables = [];
        const columnMetadata = [];
        const schemaName = 'main';

        // Get column information
        const describeReader = await conn.runAndReadAll(
          `DESCRIBE "sheet"`,
        );
        await describeReader.readAll();
        const describeRows = describeReader.getRowObjectsJS() as Array<{
          column_name: string;
          column_type: string;
          null: string;
        }>;

        // Get row count
        const countReader = await conn.runAndReadAll(
          `SELECT COUNT(*) as count FROM "sheet"`,
        );
        await countReader.readAll();
        const countRows = countReader.getRowObjectsJS() as Array<{
          count: bigint;
        }>;
        const rowCount = countRows[0]?.count ?? BigInt(0);

        tables.push({
          id: 1,
          schema: schemaName,
          name: 'sheet',
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
            id: `${schemaName}.sheet.${col.column_name}`,
            table_id: 1,
            schema: schemaName,
            table: 'sheet',
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

    async query(sql: string): Promise<DatasourceResultSet> {
      const { instance } = await getInstance();
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

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error(
          'gsheet-csv attach requires queryEngineConnection in DriverContext',
        );
      }
      const sharedLink = parsedConfig.sharedLink;
      const spreadsheetId = extractSpreadsheetId(sharedLink);
      if (!spreadsheetId) {
        throw new Error(
          `Invalid Google Sheets URL: ${sharedLink}. Expected https://docs.google.com/spreadsheets/d/{id}/...`,
        );
      }

      const triedGids = new Set<number>();
      const tabsWithUrl: Array<{ gid: number; csvUrl: string; name?: string }> =
        [];

      const addTab = (gid: number, name?: string) => {
        if (triedGids.has(gid)) return;
        triedGids.add(gid);
        tabsWithUrl.push({
          gid,
          csvUrl: convertToCsvLink(spreadsheetId, gid),
          name,
        });
      };

      const metadata = await fetchSpreadsheetMetadata(spreadsheetId);
      for (const m of metadata) addTab(m.gid, m.name);
      for (const gid of extractGidsFromUrl(sharedLink)) addTab(gid);
      addTab(0);

      const validatedTabs: typeof tabsWithUrl = [];
      for (const tab of tabsWithUrl) {
        try {
          const escaped = tab.csvUrl.replace(/'/g, "''");
          const r = await conn.runAndReadAll(
            `SELECT * FROM read_csv_auto('${escaped}') LIMIT 1`,
          );
          await r.readAll();
          validatedTabs.push(tab);
        } catch {
          context.logger?.warn?.(
            `gsheet-csv: tab gid=${tab.gid} not accessible, skipping`,
          );
        }
      }

      if (validatedTabs.length === 0) {
        throw new Error(
          `No accessible tabs in Google Sheet: ${sharedLink}. Ensure the sheet is publicly accessible.`,
        );
      }

      const schemaName = options.schemaName ?? 'main';
      const escapedSchema = schemaName.replace(/"/g, '""');
      if (schemaName !== 'main') {
        await conn.run(`CREATE SCHEMA IF NOT EXISTS "${escapedSchema}"`);
      }

      const resultTables: DriverAttachResult['tables'] = [];
      const usedNames = new Set<string>();

      for (const tab of validatedTabs) {
        let tableName: string;
        if (tab.name) {
          tableName = sanitizeTableName(tab.name);
          let n = tableName;
          let c = 1;
          while (usedNames.has(n)) {
            n = `${tableName}_${c}`;
            c += 1;
          }
          tableName = n;
        } else {
          tableName = `tab_${tab.gid}`;
          let c = 1;
          while (usedNames.has(tableName)) {
            tableName = `tab_${tab.gid}_${c}`;
            c += 1;
          }
        }
        usedNames.add(tableName);

        const escapedTable = tableName.replace(/"/g, '""');
        const escapedUrl = tab.csvUrl.replace(/'/g, "''");
        await conn.run(`
          CREATE OR REPLACE VIEW "${escapedSchema}"."${escapedTable}" AS
          SELECT * FROM read_csv_auto('${escapedUrl}')
        `);
        resultTables.push({
          schema: schemaName,
          table: tableName,
          path: `${schemaName}.${tableName}`,
        });
      }

      return { tables: resultTables };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error(
          'gsheet-csv detach requires queryEngineConnection in DriverContext',
        );
      }
      const schemaName = options.schemaName ?? 'main';
      const escapedSchema = schemaName.replace(/"/g, '""');
      const tableNames = options.tableNames ?? [];
      for (const table of tableNames) {
        const escapedTable = table.replace(/"/g, '""');
        await conn.run(
          `DROP VIEW IF EXISTS "${escapedSchema}"."${escapedTable}"`,
        );
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

