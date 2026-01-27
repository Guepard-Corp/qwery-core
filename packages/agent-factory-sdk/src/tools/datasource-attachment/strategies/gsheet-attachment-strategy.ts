import type {
  AttachmentStrategy,
  AttachmentResult,
  GSheetAttachmentOptions,
} from '../types';
import { getDatasourceDatabaseName } from '../../datasource-name-utils';
import { generateSemanticViewName } from '../../view-registry';
import type { SimpleSchema } from '@qwery/domain/entities';

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
  );
  return match?.[1] ?? null;
}

/**
 * Fetch spreadsheet metadata (tab names and GIDs) for a public Google Sheet
 */
async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
): Promise<Array<{ gid: number; name: string }>> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    const tabs: Array<{ gid: number; name: string }> = [];

    // Look for "sheetId":(\d+),"title":"([^"]+)" which is common in bootstrapData
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
    console.warn(`[GSheetAttach] Failed to fetch spreadsheet metadata:`, error);
    return [];
  }
}

/**
 * Generate CSV export URL for a specific tab (gid).
 * For gid 0, omit the gid param—Google returns 400 for &gid=0 on many sheets.
 */
function getCsvUrlForTab(spreadsheetId: string, gid: number): string {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  return gid === 0 ? base : `${base}&gid=${gid}`;
}

/**
 * Extract gid values from Google Sheets URL
 */
function extractGidsFromUrl(url: string): number[] {
  const gids: number[] = [];

  // Extract from query params: ?gid=XXX
  const queryMatch = url.match(/[?&]gid=(\d+)/);
  if (queryMatch && queryMatch[1]) {
    const gid = parseInt(queryMatch[1], 10);
    if (!isNaN(gid)) {
      gids.push(gid);
    }
  }

  // Extract from hash: #gid=XXX
  const hashMatch = url.match(/#gid=(\d+)/);
  if (hashMatch && hashMatch[1]) {
    const gid = parseInt(hashMatch[1], 10);
    if (!isNaN(gid) && !gids.includes(gid)) {
      gids.push(gid);
    }
  }

  return gids;
}

interface GSheetTab {
  gid: number;
  csvUrl: string;
  name?: string;
}

/**
 * Discover tabs by extracting gids from the URL and fetching metadata
 */
async function discoverTabs(
  conn: Awaited<
    ReturnType<import('@duckdb/node-api').DuckDBInstance['connect']>
  >,
  spreadsheetId: string,
  originalUrl?: string,
): Promise<GSheetTab[]> {
  const tabs: GSheetTab[] = [];
  const triedGids = new Set<number>();

  // Helper to add a tab and mark gid as tried
  const addTab = (gid: number, csvUrl: string, name?: string) => {
    if (!triedGids.has(gid)) {
      tabs.push({ gid, csvUrl, name });
      triedGids.add(gid);
      return true;
    }
    const existing = tabs.find((t) => t.gid === gid);
    if (existing && name && !existing.name) {
      existing.name = name;
    }
    return false;
  };

  // 1. Try to discover all tabs via metadata
  console.log(
    `[GSheetAttach] Fetching metadata for spreadsheet ${spreadsheetId}`,
  );
  const metadata = await fetchSpreadsheetMetadata(spreadsheetId);
  for (const meta of metadata) {
    addTab(meta.gid, getCsvUrlForTab(spreadsheetId, meta.gid), meta.name);
  }

  // 2. Try gids extracted from URL
  if (originalUrl) {
    const urlGids = extractGidsFromUrl(originalUrl);
    for (const gid of urlGids) {
      addTab(gid, getCsvUrlForTab(spreadsheetId, gid));
    }
  }

  // 3. Always ensure gid=0 is tried
  addTab(0, getCsvUrlForTab(spreadsheetId, 0));

  // 4. Validate accessibility for tabs
  const validatedTabs: GSheetTab[] = [];
  for (const tab of tabs) {
    try {
      const csvUrl = tab.csvUrl;
      const testReader = await conn.runAndReadAll(
        `SELECT * FROM read_csv_auto('${csvUrl.replace(/'/g, "''")}') LIMIT 1`,
      );
      await testReader.readAll();
      validatedTabs.push(tab);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[GSheetAttach] Tab gid=${tab.gid} (${tab.name || 'unnamed'}) is not accessible:`,
        errorMsg,
      );
    }
  }

  console.log(
    `[GSheetAttach] Tab discovery complete: found ${validatedTabs.length} accessible tab(s)`,
  );

  return validatedTabs;
}

export class GSheetAttachmentStrategy implements AttachmentStrategy {
  canHandle(provider: string): boolean {
    return provider === 'gsheet-csv';
  }

  async attach(options: GSheetAttachmentOptions): Promise<AttachmentResult> {
    const {
      connection: conn,
      datasource,
      extractSchema: shouldExtractSchema = true,
      conversationId,
      workspace,
    } = options;

    const config = datasource.config as Record<string, unknown>;
    const sharedLink = (config.sharedLink as string) || (config.url as string);

    if (!sharedLink) {
      throw new Error(
        'gsheet-csv datasource requires sharedLink or url in config',
      );
    }

    // Extract spreadsheet ID
    const spreadsheetId = extractSpreadsheetId(sharedLink);
    if (!spreadsheetId) {
      throw new Error(
        `Invalid Google Sheets URL format: ${sharedLink}. Expected format: https://docs.google.com/spreadsheets/d/{id}/...`,
      );
    }

    // Use datasource name directly as database name (sanitized)
    const attachedDatabaseName = getDatasourceDatabaseName(datasource);
    const escapedDbName = attachedDatabaseName.replace(/"/g, '""');

    // Create persistent attached database using SQLite file
    try {
      const escapedDbNameForQuery = attachedDatabaseName.replace(/'/g, "''");
      const dbListReader = await conn.runAndReadAll(
        `SELECT name FROM pragma_database_list WHERE name = '${escapedDbNameForQuery}'`,
      );
      await dbListReader.readAll();
      const existingDbs = dbListReader.getRowObjectsJS() as Array<{
        name: string;
      }>;

      if (existingDbs.length === 0) {
        const { join } = await import('node:path');
        const { mkdir } = await import('node:fs/promises');
        const conversationDir = join(workspace, conversationId);
        await mkdir(conversationDir, { recursive: true });
        const dbFilePath = join(conversationDir, `${attachedDatabaseName}.db`);

        const escapedPath = dbFilePath.replace(/'/g, "''");
        await conn.run(`ATTACH '${escapedPath}' AS "${escapedDbName}"`);

        console.log(
          `[GSheetAttach] Attached persistent database: ${attachedDatabaseName} at ${dbFilePath}`,
        );
      }
    } catch (error) {
      console.warn(
        `[GSheetAttach] Could not attach database ${attachedDatabaseName}, continuing:`,
        error,
      );
    }

    // Drop all existing tables to ensure fresh start with semantic names
    try {
      const existingTablesReader = await conn.runAndReadAll(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_catalog = '${attachedDatabaseName.replace(/'/g, "''")}' 
           AND table_schema = 'main' 
           AND table_type = 'BASE TABLE'`,
      );
      await existingTablesReader.readAll();
      const existingTables = existingTablesReader.getRowObjectsJS() as Array<{
        table_name: string;
      }>;

      if (existingTables.length > 0) {
        console.log(
          `[GSheetAttach] Dropping ${existingTables.length} existing table(s) to ensure semantic naming`,
        );
        for (const table of existingTables) {
          const escapedTableName = table.table_name.replace(/"/g, '""');
          try {
            await conn.run(
              `DROP TABLE IF EXISTS "${escapedDbName}"."${escapedTableName}"`,
            );
          } catch (error) {
            console.warn(
              `[GSheetAttach] Failed to drop table ${table.table_name}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.warn(
        `[GSheetAttach] Failed to check/drop existing tables, continuing with tab discovery:`,
        error,
      );
    }

    // Discover tabs
    console.log(
      `[GSheetAttach] Discovering tabs for spreadsheet ${spreadsheetId}...`,
    );
    const tabs = await discoverTabs(conn, spreadsheetId, sharedLink);

    if (tabs.length === 0) {
      throw new Error(
        `No tabs found in Google Sheet: ${sharedLink}. Make sure the sheet is publicly accessible.`,
      );
    }

    console.log(
      `[GSheetAttach] Found ${tabs.length} tab(s) in spreadsheet ${spreadsheetId}`,
    );

    // Create tables for each tab
    const tables: AttachmentResult['tables'] = [];
    const existingTableNames: string[] = [];

    for (const { gid, csvUrl, name: tabName } of tabs) {
      try {
        let tableName: string;
        const tempTableName = `temp_tab_${gid}`;
        const escapedTempTableName = tempTableName.replace(/"/g, '""');

        if (tabName) {
          tableName = tabName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
          if (/^\d/.test(tableName)) tableName = `v_${tableName}`;
        } else {
          tableName = `tab_${gid}`;
        }

        // Drop temp table if it exists
        try {
          await conn.run(
            `DROP TABLE IF EXISTS "${escapedDbName}"."${escapedTempTableName}"`,
          );
        } catch {
          // Ignore errors
        }

        // Create temp table to get schema
        await conn.run(`
          CREATE TABLE "${escapedDbName}"."${escapedTempTableName}" AS 
          SELECT * FROM read_csv_auto('${csvUrl.replace(/'/g, "''")}')
        `);

        // Extract schema to generate semantic name
        let schema: SimpleSchema | undefined;
        if (shouldExtractSchema) {
          try {
            const describeReader = await conn.runAndReadAll(
              `DESCRIBE "${escapedDbName}"."${escapedTempTableName}"`,
            );
            await describeReader.readAll();
            const describeRows = describeReader.getRowObjectsJS() as Array<{
              column_name: string;
              column_type: string;
            }>;

            const columns = describeRows.map((row) => ({
              columnName: row.column_name,
              columnType: row.column_type,
            }));

            schema = {
              databaseName: attachedDatabaseName,
              schemaName: attachedDatabaseName,
              tables: [
                {
                  tableName: tabName || tempTableName,
                  columns,
                },
              ],
            };
          } catch (error) {
            console.warn(
              `[GSheetAttach] Failed to extract schema for tab gid=${gid}:`,
              error,
            );
          }
        }

        // Generate semantic table name if not already set
        if (!tableName || tableName === `tab_${gid}`) {
          if (schema) {
            tableName = generateSemanticViewName(schema, existingTableNames);
          } else {
            tableName = `tab_${gid}`;
            let counter = 1;
            while (existingTableNames.includes(tableName)) {
              tableName = `tab_${gid}_${counter}`;
              counter++;
            }
          }
        }

        // Ensure uniqueness
        let counter = 1;
        const baseName = tableName;
        while (existingTableNames.includes(tableName)) {
          tableName = `${baseName}_${counter}`;
          counter++;
        }

        existingTableNames.push(tableName);

        // Rename temp table to final name
        const escapedTableName = tableName.replace(/"/g, '""');
        try {
          await conn.run(
            `DROP TABLE IF EXISTS "${escapedDbName}"."${escapedTableName}"`,
          );
        } catch {
          // Ignore errors
        }

        await conn.run(`
          ALTER TABLE "${escapedDbName}"."${escapedTempTableName}" 
          RENAME TO "${escapedTableName}"
        `);

        tables.push({
          schema: attachedDatabaseName,
          table: tableName,
          path: `${attachedDatabaseName}.${attachedDatabaseName}.${tableName}`,
          csvUrl,
          schemaDefinition: schema,
        });

        console.log(
          `[GSheetAttach] Created table ${attachedDatabaseName}.${tableName} from tab gid=${gid}`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[GSheetAttach] Failed to create table for tab gid=${gid}:`,
          errorMsg,
        );
      }
    }

    if (tables.length === 0) {
      throw new Error(
        `Failed to create any tables from Google Sheet: ${sharedLink}`,
      );
    }

    return {
      attachedDatabaseName,
      tables,
    };
  }
}
