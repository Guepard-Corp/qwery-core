import { type ClickHouseClient, createClient } from '@clickhouse/client';
import {
  buildMetadataFromInformationSchema,
  type DatasourceMetadata,
  type DatasourceResultSet,
  type DriverContext,
  extractConnectionUrl,
  type IDataSourceDriver,
  type InformationSchemaRow,
  makeDriver,
} from '@qwery/extension-sdk';
import { schema } from './schema';

/** Translate a `clickhouse://` / `http://` URL into a `@clickhouse/client` config. */
export function buildClickHouseConfig(connectionUrl: string) {
  const url = new URL(connectionUrl);
  const protocol = url.protocol === 'clickhouse:' ? 'http:' : url.protocol;
  const host = `${protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
  return {
    host,
    username: url.username ? decodeURIComponent(url.username) : 'default',
    password: url.password ? decodeURIComponent(url.password) : '',
    database: url.pathname ? url.pathname.replace(/^\//, '') || 'default' : 'default',
  };
}

// Native driver: ClickHouse is queried through its own HTTP client, NOT through
// DuckDB (which cannot speak ClickHouse). queryEngineConnection is unused.
export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const parsedConfig = schema.parse(context.config);
  const connectionUrl = extractConnectionUrl(parsedConfig as Record<string, unknown>, 'clickhouse-node');

  let client: ClickHouseClient | null = null;
  const getClient = (): ClickHouseClient => {
    if (!client) client = createClient(buildClickHouseConfig(connectionUrl));
    return client;
  };

  return {
    async testConnection(): Promise<void> {
      await getClient().query({ query: 'SELECT 1', format: 'JSON' });
      context.logger?.info?.('clickhouse: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const result = await getClient().query({
        query: `SELECT database AS table_schema, table AS table_name, name AS column_name,
                       type AS data_type, position AS ordinal_position,
                       if(startsWith(type, 'Nullable('), 'YES', 'NO') AS is_nullable
                  FROM system.columns
                 WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
                 ORDER BY database, table, position`,
        format: 'JSON',
      });
      const json = await result.json<{ data: Array<Record<string, unknown>> }>();
      // ClickHouse's JSON format serializes UInt64 (position) as a string — `Number` handles both.
      const rows: InformationSchemaRow[] = json.data.map((r) => ({
        table_schema: String(r.table_schema ?? ''),
        table_name: String(r.table_name ?? ''),
        column_name: String(r.column_name ?? ''),
        data_type: String(r.data_type ?? ''),
        ordinal_position: Number(r.ordinal_position ?? 0),
        is_nullable: String(r.is_nullable ?? 'NO'),
      }));
      return buildMetadataFromInformationSchema({ driver: 'clickhouse.node', rows });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const startTime = Date.now();
      const result = await getClient().query({ query: sql, format: 'JSON' });
      const json = await result.json<{
        data: Array<Record<string, unknown>>;
        meta: Array<{ name: string; type: string }>;
      }>();
      return {
        columns: json.meta.map((m) => ({ name: m.name, displayName: m.name, originalType: m.type })),
        rows: json.data,
        stat: {
          rowsAffected: 0,
          rowsRead: json.data.length,
          rowsWritten: 0,
          queryDurationMs: Date.now() - startTime,
        },
      };
    },

    async close(): Promise<void> {
      if (client) {
        await client.close();
        client = null;
      }
      context.logger?.info?.('clickhouse: closed');
    },
  };
});

export default driverFactory;
