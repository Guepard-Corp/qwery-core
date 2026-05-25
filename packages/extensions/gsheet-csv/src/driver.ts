import {
  type DatasourceMetadata,
  type DatasourceResultSet,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  type DriverAttachOptions,
  type DriverAttachResult,
  type DriverContext,
  type DriverDetachOptions,
  type DuckDbDescribeRow,
  escapeSqlIdentifier,
  escapeSqlStringLiteral,
  getQueryEngineConnection,
  type IDataSourceDriver,
  makeDriver,
  metadataFromDescribeRows,
  resultSetFromReader,
  withTimeout,
} from '@qwery/extension-sdk';
import {
  convertToCsvLink,
  extractGidsFromUrl,
  extractSpreadsheetId,
  fetchSpreadsheetMetadata,
  resolveFirstCsvUrl,
  sanitizeTableName,
} from './gsheet';
import { type GsheetCsvConfig, schema } from './schema';

const escId = escapeSqlIdentifier;
const escStr = escapeSqlStringLiteral;

export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const config: GsheetCsvConfig = schema.parse(context.config);

  return {
    async testConnection(): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error('gsheet-csv: queryEngineConnection is required in DriverContext');
      }
      await withTimeout(
        (async () => {
          const csvUrl = await resolveFirstCsvUrl(config.sharedLink);
          const reader = await conn.runAndReadAll(
            `SELECT COUNT(*) AS rows FROM read_csv_auto('${escStr(csvUrl)}') LIMIT 1`,
          );
          await reader.readAll();
        })(),
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `gsheet-csv: could not read the sheet within ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms. Ensure it is publicly accessible.`,
      );
      context.logger?.info?.('gsheet-csv: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('gsheet-csv: queryEngineConnection is required');
      const csvUrl = await resolveFirstCsvUrl(config.sharedLink);
      const reader = await conn.runAndReadAll(`DESCRIBE SELECT * FROM read_csv_auto('${escStr(csvUrl)}')`);
      await reader.readAll();
      return metadataFromDescribeRows({
        driver: 'gsheet-csv.duckdb',
        schema: 'main',
        table: 'sheet',
        rows: reader.getRowObjectsJS() as DuckDbDescribeRow[],
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('gsheet-csv: queryEngineConnection is required');
      const reader = await conn.runAndReadAll(sql);
      await reader.readAll();
      return resultSetFromReader(reader);
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('gsheet-csv: queryEngineConnection is required');

      const spreadsheetId = extractSpreadsheetId(config.sharedLink);
      if (!spreadsheetId) {
        throw new Error(`Invalid Google Sheets URL: ${config.sharedLink}`);
      }

      // Collect candidate tabs: scraped metadata, gids in the URL, then gid 0.
      const tried = new Set<number>();
      const candidates: Array<{ gid: number; name?: string }> = [];
      const addTab = (gid: number, name?: string) => {
        if (tried.has(gid)) return;
        tried.add(gid);
        candidates.push({ gid, name });
      };
      for (const tab of await fetchSpreadsheetMetadata(spreadsheetId)) addTab(tab.gid, tab.name);
      for (const gid of extractGidsFromUrl(config.sharedLink)) addTab(gid);
      addTab(0);

      const schemaName = options.schemaName ?? 'main';
      if (schemaName !== 'main') {
        await conn.run(`CREATE SCHEMA IF NOT EXISTS "${escId(schemaName)}"`);
      }

      const tables: DriverAttachResult['tables'] = [];
      const usedNames = new Set<string>();
      for (const tab of candidates) {
        const csvUrl = convertToCsvLink(spreadsheetId, tab.gid);
        // Skip tabs that are not actually readable.
        try {
          const probe = await conn.runAndReadAll(`SELECT * FROM read_csv_auto('${escStr(csvUrl)}') LIMIT 1`);
          await probe.readAll();
        } catch {
          context.logger?.warn?.(`gsheet-csv: tab gid=${tab.gid} not accessible, skipping`);
          continue;
        }

        let tableName = tab.name ? sanitizeTableName(tab.name) : `tab_${tab.gid}`;
        let suffix = 1;
        const baseName = tableName;
        while (usedNames.has(tableName)) {
          tableName = `${baseName}_${suffix}`;
          suffix += 1;
        }
        usedNames.add(tableName);

        await conn.run(
          `CREATE OR REPLACE VIEW "${escId(schemaName)}"."${escId(tableName)}" AS ` +
            `SELECT * FROM read_csv_auto('${escStr(csvUrl)}')`,
        );
        tables.push({ schema: schemaName, table: tableName, path: `${schemaName}.${tableName}` });
      }

      if (tables.length === 0) {
        throw new Error(
          `No accessible tabs in Google Sheet: ${config.sharedLink}. Ensure it is publicly accessible.`,
        );
      }
      context.logger?.info?.(`gsheet-csv: attached ${tables.length} tab(s) under ${schemaName}`);
      return { tables };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('gsheet-csv: queryEngineConnection is required');
      const schemaName = options.schemaName ?? 'main';
      for (const table of options.tableNames ?? []) {
        await conn.run(`DROP VIEW IF EXISTS "${escId(schemaName)}"."${escId(table)}"`);
      }
    },
  };
});

export default driverFactory;
