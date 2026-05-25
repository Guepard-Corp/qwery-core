import {
  buildMetadataFromInformationSchema,
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
  type InformationSchemaRow,
  makeDriver,
  type QueryEngineConnection,
  resultSetFromReader,
  withTimeout,
} from '@qwery/extension-sdk';
import { schema, type XlsxLocalConfig } from './schema';
import { listSheets, sanitizeSheetName } from './xlsx';

const escId = escapeSqlIdentifier;
const escStr = escapeSqlStringLiteral;

/** The `excel` extension ships `read_xlsx`; it is loaded on demand. */
async function ensureExcel(conn: QueryEngineConnection): Promise<void> {
  await conn.run('INSTALL excel;');
  await conn.run('LOAD excel;');
}

/**
 * Builds the `read_xlsx(...)` source for one worksheet.
 *
 * `allText` forces `all_varchar`, reading every cell as text. read_xlsx infers
 * a column type from the first rows, so a column that looks numeric early but
 * holds a string later (e.g. an ID column) makes a typed read fail; text mode
 * is the lossless fallback (unlike `ignore_errors`, which nulls bad cells).
 */
function xlsxSource(path: string, sheet?: string, allText = false): string {
  const args = [`'${escStr(path)}'`];
  if (sheet) args.push(`sheet = '${escStr(sheet)}'`);
  if (allText) args.push('all_varchar = true');
  return `read_xlsx(${args.join(', ')})`;
}

interface SheetView {
  sheet?: string;
  view: string;
}

interface SheetPlan extends SheetView {
  allText: boolean;
}

/**
 * Resolves which worksheets to expose: the single configured one, otherwise
 * every sheet discovered in the workbook. Falls back to the default sheet when
 * discovery yields nothing (e.g. an unreadable workbook.xml).
 */
function resolveSheets(config: XlsxLocalConfig): SheetView[] {
  if (config.sheet) {
    return [{ sheet: config.sheet, view: sanitizeSheetName(config.sheet) }];
  }
  const names = listSheets(config.path);
  if (names.length === 0) return [{ sheet: undefined, view: 'data' }];

  const used = new Set<string>();
  return names.map((name) => {
    let view = sanitizeSheetName(name) || 'sheet';
    const base = view;
    let suffix = 1;
    while (used.has(view)) {
      view = `${base}_${suffix}`;
      suffix += 1;
    }
    used.add(view);
    return { sheet: name, view };
  });
}

/**
 * Decides whether a sheet must be read as text. Probes a typed full scan; if it
 * fails on a cell conversion, retries in text mode. Re-throws the original error
 * when text mode also fails (a genuine read problem, e.g. a missing file).
 */
async function needsTextMode(
  conn: QueryEngineConnection,
  path: string,
  sheet: string | undefined,
): Promise<boolean> {
  try {
    const reader = await conn.runAndReadAll(`SELECT COUNT(*) FROM ${xlsxSource(path, sheet)}`);
    await reader.readAll();
    return false;
  } catch (typedError) {
    try {
      const reader = await conn.runAndReadAll(`SELECT COUNT(*) FROM ${xlsxSource(path, sheet, true)}`);
      await reader.readAll();
      return true;
    } catch {
      throw typedError;
    }
  }
}

/** Resolves the worksheets and the read mode each one needs. */
async function planSheets(conn: QueryEngineConnection, config: XlsxLocalConfig): Promise<SheetPlan[]> {
  const plans: SheetPlan[] = [];
  for (const { sheet, view } of resolveSheets(config)) {
    plans.push({ sheet, view, allText: await needsTextMode(conn, config.path, sheet) });
  }
  return plans;
}

export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const config: XlsxLocalConfig = schema.parse(context.config);

  return {
    async testConnection(): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error('xlsx-local: queryEngineConnection is required in DriverContext');
      }
      await withTimeout(
        (async () => {
          await ensureExcel(conn);
          const [first] = resolveSheets(config);
          // Probes typed → text, throwing only when the sheet is truly unreadable.
          await needsTextMode(conn, config.path, first?.sheet);
        })(),
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `xlsx-local: could not read '${config.path}' within ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms.`,
      );
      context.logger?.info?.('xlsx-local: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('xlsx-local: queryEngineConnection is required');
      await ensureExcel(conn);

      const rows: InformationSchemaRow[] = [];
      for (const { sheet, view, allText } of await planSheets(conn, config)) {
        const reader = await conn.runAndReadAll(
          `DESCRIBE SELECT * FROM ${xlsxSource(config.path, sheet, allText)}`,
        );
        await reader.readAll();
        const describeRows = reader.getRowObjectsJS() as DuckDbDescribeRow[];
        describeRows.forEach((row, index) => {
          rows.push({
            table_schema: 'main',
            table_name: view,
            column_name: row.column_name,
            data_type: row.column_type,
            ordinal_position: index + 1,
            is_nullable: typeof row.null === 'string' ? row.null : 'YES',
          });
        });
      }
      return buildMetadataFromInformationSchema({ driver: 'xlsx-local.duckdb', rows });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('xlsx-local: queryEngineConnection is required');
      const reader = await conn.runAndReadAll(sql);
      await reader.readAll();
      return resultSetFromReader(reader);
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('xlsx-local: queryEngineConnection is required');
      await ensureExcel(conn);

      const schemaName = options.schemaName ?? 'main';
      if (schemaName !== 'main') {
        await conn.run(`CREATE SCHEMA IF NOT EXISTS "${escId(schemaName)}"`);
      }

      const tables: DriverAttachResult['tables'] = [];
      for (const { sheet, view, allText } of await planSheets(conn, config)) {
        await conn.run(
          `CREATE OR REPLACE VIEW "${escId(schemaName)}"."${escId(view)}" AS ` +
            `SELECT * FROM ${xlsxSource(config.path, sheet, allText)}`,
        );
        tables.push({ schema: schemaName, table: view, path: `${schemaName}.${view}` });
      }
      context.logger?.info?.(`xlsx-local: attached ${tables.length} sheet(s) under ${schemaName}`);
      return { tables };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('xlsx-local: queryEngineConnection is required');
      const schemaName = options.schemaName ?? 'main';
      const views = options.tableNames ?? resolveSheets(config).map((s) => s.view);
      for (const view of views) {
        await conn.run(`DROP VIEW IF EXISTS "${escId(schemaName)}"."${escId(view)}"`);
      }
    },
  };
});

export default driverFactory;
