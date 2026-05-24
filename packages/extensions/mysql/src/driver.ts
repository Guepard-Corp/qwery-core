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
  extractConnectionUrl,
  getQueryEngineConnection,
  type IDataSourceDriver,
  type InformationSchemaRow,
  makeDriver,
  withTimeout,
} from '@qwery/extension-sdk';
import { type Connection, createConnection } from 'mysql2/promise';
import { schema } from './schema';

const MAX_ATTACHED_TABLES = 50;
const escId = escapeSqlIdentifier;
const escStr = escapeSqlStringLiteral;

export function catalogNameFor(slug?: string, id?: string): string {
  const seed = (slug ?? id ?? 'db').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `mysql_${seed}`.slice(0, 60);
}

/** Translate a `mysql://` URL into a `mysql2` connection config (native data access). */
export function buildMysqlConfig(connectionUrl: string) {
  const url = new URL(connectionUrl);
  const ssl = url.searchParams.get('ssl') === 'true';
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: url.pathname ? url.pathname.replace(/^\//, '') || undefined : undefined,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
  };
}

/**
 * The DuckDB `mysql` scanner wants a libmysql DSN (`host=… port=… user=…`),
 * NOT a `mysql://` URL (unlike the postgres scanner). Used only by `attach`,
 * which federates into the host query engine.
 */
export function buildMysqlAttachDsn(connectionUrl: string): string {
  const url = new URL(connectionUrl);
  const parts = [`host=${url.hostname}`, `port=${url.port || '3306'}`];
  if (url.username) parts.push(`user=${decodeURIComponent(url.username)}`);
  if (url.password) parts.push(`password=${decodeURIComponent(url.password)}`);
  const db = url.pathname.replace(/^\//, '');
  if (db) parts.push(`database=${db}`);
  return parts.join(' ');
}

// testConnection / metadata / query are NATIVE (mysql2). attach / detach federate
// the source into whatever query engine the host runs (DuckDB here, via the
// mysql scanner) — that is a query-engine concern, not native data access.
export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const parsedConfig = schema.parse(context.config);
  const connectionUrl = extractConnectionUrl(parsedConfig as Record<string, unknown>, 'mysql');

  const withConnection = async <T>(
    callback: (connection: Connection) => Promise<T>,
    timeoutMs: number = DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  ): Promise<T> => {
    const promise = (async () => {
      const connection = await createConnection(buildMysqlConfig(connectionUrl));
      try {
        return await callback(connection);
      } finally {
        await connection.end().catch(() => undefined);
      }
    })();
    return withTimeout(promise, timeoutMs, `MySQL connection operation timed out after ${timeoutMs}ms`);
  };

  return {
    async testConnection(): Promise<void> {
      await withConnection((c) => c.query('SELECT 1'));
      context.logger?.info?.('mysql: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const results = await withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT table_schema, table_name, column_name, data_type, ordinal_position, is_nullable
             FROM information_schema.columns
            WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
            ORDER BY table_schema, table_name, ordinal_position;`,
        );
        return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
      });

      // MySQL may upper- or lower-case information_schema columns; read both.
      const val = (row: Record<string, unknown>, key: string): unknown => row[key] ?? row[key.toUpperCase()];
      const rows: InformationSchemaRow[] = results
        .map((row) => ({
          table_schema: String(val(row, 'table_schema') ?? '').trim(),
          table_name: String(val(row, 'table_name') ?? '').trim(),
          column_name: String(val(row, 'column_name') ?? '').trim(),
          data_type: String(val(row, 'data_type') ?? '').trim(),
          ordinal_position: Number(val(row, 'ordinal_position') ?? 0),
          is_nullable: String(val(row, 'is_nullable') ?? 'NO').trim(),
        }))
        .filter((r) => r.table_schema && r.table_name && r.column_name && r.ordinal_position > 0);

      return buildMetadataFromInformationSchema({ driver: 'mysql', rows });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const startTime = Date.now();
      const [rows, fields] = await withConnection((c) => c.query(sql));
      const durationMs = Date.now() - startTime;
      const rowArray = Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
      const fieldArray = (Array.isArray(fields) ? fields : []) as Array<{ name: string; type?: number }>;
      return {
        columns: fieldArray.map((f) => ({
          name: f.name,
          displayName: f.name,
          originalType: f.type != null ? String(f.type) : null,
        })),
        rows: rowArray,
        stat: {
          rowsAffected: rowArray.length,
          rowsRead: rowArray.length,
          rowsWritten: 0,
          queryDurationMs: durationMs,
        },
      };
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('mysql: queryEngineConnection is required to attach');
      const catalog = catalogNameFor(options.datasourceSlug, options.datasourceId);
      await conn.run('INSTALL mysql;');
      await conn.run('LOAD mysql;');
      try {
        await conn.run(`DETACH ${catalog};`);
      } catch {
        /* nothing attached — fine */
      }
      await conn.run(
        `ATTACH '${escStr(buildMysqlAttachDsn(connectionUrl))}' AS ${catalog} (TYPE mysql, READ_ONLY);`,
      );

      const tableRows = await withConnection(async (connection) => {
        const [rows] = await connection.query(
          `SELECT table_schema, table_name
             FROM information_schema.tables
            WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
              AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name
            LIMIT ${MAX_ATTACHED_TABLES + 1};`,
        );
        return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
      });
      const val = (row: Record<string, unknown>, key: string): string =>
        String(row[key] ?? row[key.toUpperCase()] ?? '');
      const tables = tableRows.slice(0, MAX_ATTACHED_TABLES).map((r) => {
        const tSchema = val(r, 'table_schema');
        const tName = val(r, 'table_name');
        return {
          schema: tSchema,
          table: tName,
          path: `"${escId(catalog)}"."${escId(tSchema)}"."${escId(tName)}"`,
        };
      });
      context.logger?.info?.(`mysql: attached as ${catalog} (${tables.length} tables)`);
      return { tables };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('mysql: queryEngineConnection is required to detach');
      const catalog = catalogNameFor(options.datasourceSlug, options.datasourceId);
      await conn.run(`DETACH ${catalog};`).catch(() => undefined);
    },

    async close(): Promise<void> {
      context.logger?.info?.('mysql: closed');
    },
  };
});

export default driverFactory;
