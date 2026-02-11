import { Client, type QueryResult as PgQueryResult } from 'pg';
import type { ConnectionOptions } from 'tls';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  PrimaryKeyRow,
  ForeignKeyRow,
} from '@qwery/extensions-sdk';
import {
  buildMetadataFromInformationSchema,
  extractConnectionUrl,
  withTimeout,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
} from '@qwery/extensions-sdk';

import type { z } from 'zod';

import { schema } from './schema';

type Config = z.infer<typeof schema>;

export function buildPostgresConfig(config: Config) {
  // Extract connection URL (either from connectionUrl or build from fields)
  const connectionUrl = extractConnectionUrl(
    config as Record<string, unknown>,
    'postgresql',
  );
  return buildPgConfig(connectionUrl);
}

function buildPgConfig(connectionUrl: string) {
  const url = new URL(connectionUrl);
  const sslmode = url.searchParams.get('sslmode');
  const ssl: ConnectionOptions | undefined =
    sslmode === 'require'
      ? {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
      }
      : undefined;

  return {
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    database: url.pathname ? url.pathname.replace(/^\//, '') || undefined : undefined,
    ssl,
  };
}

export function makePostgresDriver(context: DriverContext): IDataSourceDriver {
  const parsedConfig = schema.parse(context.config);
  const connectionUrl = extractConnectionUrl(parsedConfig as Record<string, unknown>, 'postgresql');

  const withClient = async <T>(
    config: { connectionUrl: string },
    callback: (client: Client) => Promise<T>,
    timeoutMs: number = DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  ): Promise<T> => {
    const clientPromise = (async () => {
      const client = new Client(buildPgConfig(config.connectionUrl));
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
      await withClient(
        { connectionUrl },
        async (client) => {
          await client.query('SELECT 1');
        },
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
      );
      context.logger?.info?.('postgres: testConnection ok');
    },

    async metadata() {
      const rows = await withClient({ connectionUrl }, async (client) => {
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

      const primaryKeyRows = await withClient({ connectionUrl }, async (client) => {
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

      const foreignKeyRows = await withClient({ connectionUrl }, async (client) => {
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
      const { rows, rowCount, fields } = (await withClient(
        { connectionUrl },
        (client) => client.query(sql),
      )) as PgQueryResult;

      return {
        columns: collectColumns(fields),
        rows: rows as Array<Record<string, unknown>>,
        stat: queryStat(rowCount),
      };
    },

    async close() {
      context.logger?.info?.('postgres: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makePostgresDriver;
export default driverFactory;

