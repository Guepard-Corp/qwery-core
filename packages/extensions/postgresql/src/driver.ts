import { Client, type QueryResult as PgQueryResult } from 'pg';
import type { ConnectionOptions } from 'tls';
import { z } from 'zod/v3';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
} from '@qwery/extensions-sdk';
import {
  DatasourceMetadataZodSchema,
  extractConnectionUrl,
  withTimeout,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
} from '@qwery/extensions-sdk';

const ConfigSchema = z
  .object({
    connectionUrl: z.string().url().describe('secret:true').optional(),
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    username: z.string().optional(),
    user: z.string().optional(),
    password: z.string().describe('secret:true').optional(),
    database: z.string().optional(),
    sslmode: z
      .enum(['disable', 'require', 'prefer', 'verify-ca', 'verify-full'])
      .optional(),
  })
  .refine(
    (data) => data.connectionUrl || data.host,
    {
      message: 'Either connectionUrl or host must be provided',
    },
  );

type DriverConfig = z.infer<typeof ConfigSchema>;

export function buildPostgresConfig(config: DriverConfig) {
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
    async testConnection(config: unknown): Promise<void> {
      const parsed = ConfigSchema.parse(config);
      const connectionUrl = extractConnectionUrl(
        parsed as Record<string, unknown>,
        'postgresql',
      );
      await withClient(
        { connectionUrl },
        async (client) => {
          await client.query('SELECT 1');
        },
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
      );
      context.logger?.info?.('postgres: testConnection ok');
    },

    async metadata(config: unknown) {
      const parsed = ConfigSchema.parse(config);
      const connectionUrl = extractConnectionUrl(
        parsed as Record<string, unknown>,
        'postgresql',
      );
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

      let tableId = 1;
      const tableMap = new Map<
        string,
        {
          id: number;
          schema: string;
          name: string;
          columns: Array<ReturnType<typeof buildColumn>>;
        }
      >();

      const buildColumn = (
        schema: string,
        table: string,
        name: string,
        ordinal: number,
        dataType: string,
        nullable: string,
      ) => ({
        id: `${schema}.${table}.${name}`,
        table_id: 0,
        schema,
        table,
        name,
        ordinal_position: ordinal,
        data_type: dataType,
        format: dataType,
        is_identity: false,
        identity_generation: null,
        is_generated: false,
        is_nullable: nullable === 'YES',
        is_updatable: true,
        is_unique: false,
        check: null,
        default_value: null,
        enums: [],
        comment: null,
      });

      for (const row of rows) {
        const key = `${row.table_schema}.${row.table_name}`;
        if (!tableMap.has(key)) {
          tableMap.set(key, {
            id: tableId++,
            schema: row.table_schema,
            name: row.table_name,
            columns: [],
          });
        }
        const entry = tableMap.get(key)!;
        entry.columns.push(
          buildColumn(
            row.table_schema,
            row.table_name,
            row.column_name,
            row.ordinal_position,
            row.data_type,
            row.is_nullable,
          ),
        );
      }

      let relationshipId = 1;

      const tables = Array.from(tableMap.values()).map((table) => {
        const primary_keys = primaryKeyRows
          .filter(
            (pk) =>
              pk.table_schema === table.schema && pk.table_name === table.name,
          )
          .map((pk) => ({
            table_id: table.id,
            name: pk.column_name,
            schema: table.schema,
            table_name: table.name,
          }));

        const relationships = foreignKeyRows
          .filter(
            (rel) =>
              rel.source_schema === table.schema &&
              rel.source_table_name === table.name,
          )
          .map((rel) => ({
            id: relationshipId++,
            constraint_name: rel.constraint_name,
            source_schema: rel.source_schema,
            source_table_name: rel.source_table_name,
            source_column_name: rel.source_column_name,
            target_table_schema: rel.target_table_schema,
            target_table_name: rel.target_table_name,
            target_column_name: rel.target_column_name,
          }));

        return {
          id: table.id,
          schema: table.schema,
          name: table.name,
          rls_enabled: false,
          rls_forced: false,
          bytes: 0,
          size: '0',
          live_rows_estimate: 0,
          dead_rows_estimate: 0,
          comment: null,
          primary_keys,
          relationships,
        };
      });

      const columns = Array.from(tableMap.values()).flatMap((table) =>
        table.columns.map((column) => ({
          ...column,
          table_id: table.id,
        })),
      );

      const schemas = Array.from(
        new Set(Array.from(tableMap.values()).map((table) => table.schema)),
      ).map((name, idx) => ({
        id: idx + 1,
        name,
        owner: 'unknown',
      }));

      return DatasourceMetadataZodSchema.parse({
        version: '0.0.1',
        driver: 'postgresql',
        schemas,
        tables,
        columns,
      });
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const connectionUrl = extractConnectionUrl(
        parsed as Record<string, unknown>,
        'postgresql',
      );
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

