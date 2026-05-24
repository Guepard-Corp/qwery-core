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
  type ForeignKeyRow,
  getQueryEngineConnection,
  type IDataSourceDriver,
  makeDriver,
  type PrimaryKeyRow,
  withTimeout,
} from '@qwery/extension-sdk';
import { Client, type QueryResult as PgQueryResult } from 'pg';
import { schema } from './schema';

const MAX_ATTACHED_TABLES = 50;

function catalogNameFor(slug: string | undefined, id: string | undefined): string {
  const seed = (slug ?? id ?? 'db').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `pg_${seed}`.slice(0, 60);
}

/** Translate a cleaned `postgresql://` URL into a `pg` client config. */
function buildPgConfig(connectionUrl: string) {
  const url = new URL(connectionUrl);
  const sslmode = url.searchParams.get('sslmode');
  const ssl =
    sslmode === 'require' ? { rejectUnauthorized: false, checkServerIdentity: () => undefined } : undefined;

  return {
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    database: url.pathname ? url.pathname.replace(/^\//, '') || undefined : undefined,
    ssl,
  };
}

export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const parsedConfig = schema.parse(context.config);
  const connectionUrl = extractConnectionUrl(parsedConfig as Record<string, unknown>, 'postgresql');

  const withClient = async <T>(
    callback: (client: Client) => Promise<T>,
    timeoutMs: number = DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  ): Promise<T> => {
    const clientPromise = (async () => {
      const client = new Client(buildPgConfig(connectionUrl));
      try {
        await client.connect();
        return await callback(client);
      } finally {
        await client.end().catch(() => undefined);
      }
    })();

    return withTimeout(
      clientPromise,
      timeoutMs,
      `PostgreSQL connection operation timed out after ${timeoutMs}ms`,
    );
  };

  const collectColumns = (fields: Array<{ name: string; dataTypeID: number }>) =>
    fields.map((field) => ({
      name: field.name,
      displayName: field.name,
      originalType: String(field.dataTypeID),
    }));

  const queryStat = (rowCount: number | null) => ({
    rowsAffected: rowCount ?? 0,
    rowsRead: rowCount ?? 0,
    rowsWritten: 0,
    queryDurationMs: null,
  });

  return {
    async testConnection(): Promise<void> {
      await withClient(async (client) => {
        await client.query('SELECT 1');
      });
      context.logger?.info?.('postgres: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const rows = await withClient(async (client) => {
        const result = await client.query<{
          table_schema: string;
          table_name: string;
          column_name: string;
          data_type: string;
          ordinal_position: number;
          is_nullable: string;
        }>(`
          SELECT table_schema,
                 table_name,
                 column_name,
                 data_type,
                 ordinal_position,
                 is_nullable
          FROM information_schema.columns
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
          ORDER BY table_schema, table_name, ordinal_position;
        `);
        return result.rows;
      });

      const primaryKeyRows = await withClient(async (client) => {
        const result = await client.query<{
          table_schema: string;
          table_name: string;
          column_name: string;
        }>(`
          SELECT
            kcu.table_schema,
            kcu.table_name,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.constraint_schema = kcu.constraint_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND kcu.table_schema NOT IN ('information_schema', 'pg_catalog');
        `);
        return result.rows;
      });

      const foreignKeyRows = await withClient(async (client) => {
        const result = await client.query<{
          constraint_name: string;
          source_schema: string;
          source_table_name: string;
          source_column_name: string;
          target_table_schema: string;
          target_table_name: string;
          target_column_name: string;
        }>(`
          SELECT
            tc.constraint_name,
            kcu.table_schema AS source_schema,
            kcu.table_name AS source_table_name,
            kcu.column_name AS source_column_name,
            ccu.table_schema AS target_table_schema,
            ccu.table_name AS target_table_name,
            ccu.column_name AS target_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.constraint_schema = kcu.constraint_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
           AND ccu.constraint_schema = tc.constraint_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND kcu.table_schema NOT IN ('information_schema', 'pg_catalog');
        `);
        return result.rows;
      });

      return buildMetadataFromInformationSchema({
        driver: 'postgresql',
        rows,
        primaryKeys: primaryKeyRows as PrimaryKeyRow[],
        foreignKeys: foreignKeyRows as ForeignKeyRow[],
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const { rows, rowCount, fields } = (await withClient((client) => client.query(sql))) as PgQueryResult;

      return {
        columns: collectColumns(fields),
        rows: rows as Array<Record<string, unknown>>,
        stat: queryStat(rowCount),
      };
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error('postgresql: queryEngineConnection is required in DriverContext');
      }
      const catalog = catalogNameFor(options.datasourceSlug, options.datasourceId);

      // Install/load the DuckDB postgres scanner and (re)attach the catalog in
      // read-only mode so the agent cannot accidentally mutate the upstream DB.
      await conn.run('INSTALL postgres;');
      await conn.run('LOAD postgres;');
      // Idempotent: detach a stale catalog with the same name from a previous run.
      try {
        await conn.run(`DETACH ${catalog};`);
      } catch {
        /* nothing was attached — fine */
      }
      await conn.run(
        `ATTACH '${escapeSqlStringLiteral(connectionUrl)}' AS ${catalog} (TYPE postgres, READ_ONLY);`,
      );

      // List user tables in the upstream Postgres via `pg` (the extension's
      // own driver). We could query DuckDB's information_schema once attached,
      // but pg gives us richer error messages on auth/network issues and is
      // already used by `metadata()`.
      const tableRows = await withClient(async (client) => {
        const result = await client.query<{ table_schema: string; table_name: string }>(
          `SELECT table_schema, table_name
             FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
              AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name
            LIMIT ${MAX_ATTACHED_TABLES + 1};`,
        );
        return result.rows;
      });
      if (tableRows.length > MAX_ATTACHED_TABLES) {
        context.logger?.warn?.(
          `postgresql: ${tableRows.length} tables found, only the first ${MAX_ATTACHED_TABLES} are surfaced to the agent`,
        );
      }
      const tables = tableRows.slice(0, MAX_ATTACHED_TABLES).map((row) => ({
        schema: row.table_schema,
        table: row.table_name,
        path: `"${escapeSqlIdentifier(catalog)}"."${escapeSqlIdentifier(row.table_schema)}"."${escapeSqlIdentifier(row.table_name)}"`,
      }));
      context.logger?.info?.(
        `postgresql: attached '${connectionUrl.replace(/:[^:@/]*@/, ':***@')}' as ${catalog} (${tables.length} table${tables.length === 1 ? '' : 's'})`,
      );
      return { tables };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error('postgresql: queryEngineConnection is required in DriverContext');
      }
      const catalog = catalogNameFor(options.datasourceSlug, options.datasourceId);
      try {
        await conn.run(`DETACH ${catalog};`);
      } catch {
        /* already detached */
      }
    },

    async close() {
      context.logger?.info?.('postgres: closed');
    },
  };
});

export default driverFactory;
