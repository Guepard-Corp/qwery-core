import { Client, type QueryResult as PgQueryResult } from 'pg';
import type { ConnectionOptions } from 'tls';
import { z } from 'zod';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
} from '@qwery/extensions-sdk';
import { DatasourceMetadataZodSchema } from '@qwery/extensions-sdk';

const ConfigSchema = z.object({
  connectionUrl: z.string().url(),
});

type DriverConfig = z.infer<typeof ConfigSchema>;

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
    config: DriverConfig,
    callback: (client: Client) => Promise<T>,
  ): Promise<T> => {
    const client = new Client(buildPgConfig(config.connectionUrl));
    try {
      await client.connect();
      return await callback(client);
    } finally {
      await client.end().catch(() => undefined);
    }
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
      await withClient(parsed, async (client) => {
        await client.query('SELECT 1');
      });
      context.logger?.info?.('postgres: testConnection ok');
    },

    async metadata(config: unknown) {
      const parsed = ConfigSchema.parse(config);
      const rows = await withClient(parsed, async (client) => {
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

      const tables = Array.from(tableMap.values()).map((table) => ({
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
        primary_keys: [],
        relationships: [],
      }));

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
      const { rows, rowCount, fields } = (await withClient(
        parsed,
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

