import { createClient } from '@clickhouse/client-web';
import { z } from 'zod';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import { DatasourceMetadataZodSchema } from '@qwery/extensions-sdk';
import { extractConnectionUrl } from '@qwery/extensions-sdk';

import { schema } from './schema';

type Config = z.infer<typeof schema>;

export function buildClickHouseConfigFromFields(fields: Config) {
  // Extract connection URL (either from connectionUrl or build from fields)
  const connectionUrl = extractConnectionUrl(
    fields as Record<string, unknown>,
    'clickhouse-web',
  );
  return buildClickHouseConfig(connectionUrl);
}

function buildClickHouseConfig(connectionUrl: string) {
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

export function makeClickHouseDriver(context: DriverContext): IDataSourceDriver {
  const parsedConfig = schema.parse(context.config);
  const clientMap = new Map<string, ReturnType<typeof createClient>>();

  const getClient = () => {
    // Extract connection URL (either from connectionUrl or build from fields)
    const connectionUrl = extractConnectionUrl(
      parsedConfig as Record<string, unknown>,
      'clickhouse-web',
    );
    const key = connectionUrl;
    if (!clientMap.has(key)) {
      const clientConfig = buildClickHouseConfig(connectionUrl);
      const client = createClient(clientConfig);
      clientMap.set(key, client);
    }
    return clientMap.get(key)!;
  };

  return {
    async testConnection(): Promise<void> {
      const client = getClient();
      await client.query({
        query: 'SELECT 1',
        format: 'JSON',
      });
      context.logger?.info?.('clickhouse: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const client = getClient();

      // Get databases (schemas)
      const databasesResult = await client.query({
        query: `SELECT name FROM system.databases WHERE name NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA') ORDER BY name`,
        format: 'JSON',
      });
      const databasesData = await databasesResult.json<{ data: Array<{ name: string }> }>();
      const databases = databasesData.data;

      // Get tables and columns
      const tablesResult = await client.query({
        query: `
          SELECT 
            database as table_schema,
            name as table_name,
            total_rows,
            total_bytes
          FROM system.tables
          WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
          ORDER BY database, name
        `,
        format: 'JSON',
      });
      const tablesData = await tablesResult.json<{
        data: Array<{
          table_schema: string;
          table_name: string;
          total_rows: string;
          total_bytes: string;
        }>;
      }>();

      // Get columns
      const columnsResult = await client.query({
        query: `
          SELECT 
            database as table_schema,
            table as table_name,
            name as column_name,
            type as data_type,
            position as ordinal_position,
            default_kind,
            default_expression
          FROM system.columns
          WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
          ORDER BY database, table, position
        `,
        format: 'JSON',
      });
      const columnsData = await columnsResult.json<{
        data: Array<{
          table_schema: string;
          table_name: string;
          column_name: string;
          data_type: string;
          ordinal_position: number;
          default_kind: string;
          default_expression: string;
        }>;
      }>();

      let tableId = 1;
      const tableMap = new Map<
        string,
        {
          id: number;
          schema: string;
          name: string;
          totalRows: string;
          totalBytes: string;
          columns: Array<ReturnType<typeof buildColumn>>;
        }
      >();

      const buildColumn = (
        schema: string,
        table: string,
        name: string,
        ordinal: number,
        dataType: string,
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
        is_nullable: true, // ClickHouse columns are generally nullable unless specified
        is_updatable: true,
        is_unique: false,
        check: null,
        default_value: null,
        enums: [],
        comment: null,
      });

      // Build table map
      for (const row of tablesData.data) {
        const key = `${row.table_schema}.${row.table_name}`;
        if (!tableMap.has(key)) {
          tableMap.set(key, {
            id: tableId++,
            schema: row.table_schema,
            name: row.table_name,
            totalRows: row.total_rows,
            totalBytes: row.total_bytes,
            columns: [],
          });
        }
      }

      // Add columns to tables
      for (const row of columnsData.data) {
        const key = `${row.table_schema}.${row.table_name}`;
        const table = tableMap.get(key);
        if (table) {
          table.columns.push(
            buildColumn(
              row.table_schema,
              row.table_name,
              row.column_name,
              row.ordinal_position,
              row.data_type,
            ),
          );
        }
      }

      const tables = Array.from(tableMap.values()).map((table) => ({
        id: table.id,
        schema: table.schema,
        name: table.name,
        rls_enabled: false,
        rls_forced: false,
        bytes: Number(table.totalBytes) || 0,
        size: String(table.totalRows ?? '0'),
        live_rows_estimate: Number(table.totalRows) || 0,
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

      const schemas = databases.map((db: { name: string }, idx: number) => ({
        id: idx + 1,
        name: db.name,
        owner: 'unknown',
      }));

      return DatasourceMetadataZodSchema.parse({
        version: '0.0.1',
        driver: 'clickhouse.web',
        schemas,
        tables,
        columns,
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const client = getClient();
      const startTime = performance.now();

      const result = await client.query({
        query: sql,
        format: 'JSON',
      });

      const data = await result.json<{ data: Array<Record<string, unknown>>; meta: Array<{ name: string; type: string }> }>();
      const endTime = performance.now();

      const columns = data.meta.map((meta: { name: string; type: string }) => ({
        name: meta.name,
        displayName: meta.name,
        originalType: meta.type,
      }));

      return {
        columns,
        rows: data.data,
        stat: {
          rowsAffected: 0,
          rowsRead: data.data.length,
          rowsWritten: 0,
          queryDurationMs: endTime - startTime,
        },
      };
    },

    async close() {
      // Close all ClickHouse clients
      for (const client of clientMap.values()) {
        await client.close();
      }
      clientMap.clear();
      context.logger?.info?.('clickhouse: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makeClickHouseDriver;
export default driverFactory;

