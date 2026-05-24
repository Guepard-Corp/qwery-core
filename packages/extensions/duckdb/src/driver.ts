import {
  buildMetadataFromInformationSchema,
  type DatasourceMetadata,
  type DatasourceResultSet,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  type DriverAttachOptions,
  type DriverAttachResult,
  type DriverContext,
  type DriverDetachOptions,
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
import { type DuckDbConfig, schema } from './schema';

const MAX_ATTACHED_TABLES = 50;
const escId = escapeSqlIdentifier;
const escStr = escapeSqlStringLiteral;

/** Per-datasource DuckDB catalog name, derived from the slug/id, safe to interpolate. */
export function catalogNameFor(slug?: string, id?: string): string {
  const seed = (slug ?? id ?? 'db').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `duckdb_${seed}`.slice(0, 60);
}

/** `ATTACH '<path>' AS <catalog>` — READ_ONLY for real files (never mutate upstream). */
export function buildAttachSql(database: string, catalog: string): string {
  const readOnly = database === ':memory:' ? '' : ' (READ_ONLY)';
  return `ATTACH '${escStr(database)}' AS ${catalog}${readOnly};`;
}

async function reattach(conn: QueryEngineConnection, database: string, catalog: string): Promise<void> {
  try {
    await conn.run(`DETACH ${catalog};`);
  } catch {
    /* nothing attached under this name — fine */
  }
  await conn.run(buildAttachSql(database, catalog));
}

export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const cfg: DuckDbConfig = schema.parse(context.config);

  const requireConn = (): QueryEngineConnection => {
    const conn = getQueryEngineConnection(context);
    if (!conn) throw new Error('duckdb: queryEngineConnection is required in DriverContext');
    return conn;
  };

  const tempCatalog = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

  return {
    async testConnection(): Promise<void> {
      const conn = requireConn();
      const catalog = tempCatalog('duckdb_test');
      await withTimeout(
        (async () => {
          await reattach(conn, cfg.database, catalog);
          try {
            const reader = await conn.runAndReadAll('SELECT 1');
            await reader.readAll();
          } finally {
            await conn.run(`DETACH ${catalog};`).catch(() => undefined);
          }
        })(),
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `duckdb: could not attach '${cfg.database}' within ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms.`,
      );
      context.logger?.info?.('duckdb: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      // metadata() carries no datasource id, so we can't reference the persistent
      // attach catalog by name. Attach under a throwaway catalog, introspect it,
      // then detach — independent of whatever the registry attached at startup.
      const conn = requireConn();
      const catalog = tempCatalog('duckdb_meta');
      await reattach(conn, cfg.database, catalog);
      try {
        const reader = await conn.runAndReadAll(
          `SELECT table_schema, table_name, column_name, data_type, ordinal_position, is_nullable
             FROM information_schema.columns
            WHERE table_catalog = '${escStr(catalog)}'
              AND table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name, ordinal_position;`,
        );
        await reader.readAll();
        const rows = reader.getRowObjectsJS() as unknown as InformationSchemaRow[];
        return buildMetadataFromInformationSchema({ driver: 'duckdb', rows });
      } finally {
        await conn.run(`DETACH ${catalog};`).catch(() => undefined);
      }
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const conn = requireConn();
      const reader = await conn.runAndReadAll(sql);
      await reader.readAll();
      return resultSetFromReader(reader);
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = requireConn();
      const catalog = catalogNameFor(options.datasourceSlug, options.datasourceId);
      await reattach(conn, cfg.database, catalog);
      const reader = await conn.runAndReadAll(
        `SELECT table_schema, table_name
           FROM information_schema.tables
          WHERE table_catalog = '${escStr(catalog)}'
            AND table_schema NOT IN ('information_schema', 'pg_catalog')
          ORDER BY table_schema, table_name
          LIMIT ${MAX_ATTACHED_TABLES + 1};`,
      );
      await reader.readAll();
      const rows = reader.getRowObjectsJS() as unknown as Array<{
        table_schema: string;
        table_name: string;
      }>;
      if (rows.length > MAX_ATTACHED_TABLES) {
        context.logger?.warn?.(
          `duckdb: ${rows.length} tables found, only the first ${MAX_ATTACHED_TABLES} are surfaced`,
        );
      }
      const tables = rows.slice(0, MAX_ATTACHED_TABLES).map((r) => ({
        schema: r.table_schema,
        table: r.table_name,
        path: `"${escId(catalog)}"."${escId(r.table_schema)}"."${escId(r.table_name)}"`,
      }));
      context.logger?.info?.(`duckdb: attached '${cfg.database}' as ${catalog} (${tables.length} tables)`);
      return { tables };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = requireConn();
      const catalog = catalogNameFor(options.datasourceSlug, options.datasourceId);
      await conn.run(`DETACH ${catalog};`).catch(() => undefined);
    },
  };
});

export default driverFactory;
