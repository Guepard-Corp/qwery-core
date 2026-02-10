import { createConnection, type Connection } from 'mysql2/promise';
import type { z } from 'zod';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import {
  buildMetadataFromInformationSchema,
  extractConnectionUrl,
  withTimeout,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
} from '@qwery/extensions-sdk';

import { schema } from './schema';

type Config = z.infer<typeof schema>;

export function buildMysqlConfigFromFields(fields: Config) {
  // Extract connection URL (either from connectionUrl or build from fields)
  const connectionUrl = extractConnectionUrl(
    fields as Record<string, unknown>,
    'mysql',
  );
  return buildMysqlConfig(connectionUrl);
}

function buildMysqlConfig(connectionUrl: string) {
  // Handle mysql:// URL format
  if (connectionUrl.startsWith('mysql://')) {
    const url = new URL(connectionUrl);
    const ssl = url.searchParams.get('ssl') === 'true';

    return {
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      database: url.pathname ? url.pathname.replace(/^\//, '') || undefined : undefined,
      ssl: ssl
        ? {
          rejectUnauthorized: false,
        }
        : undefined,
    };
  }

  // Handle space-separated format (for backward compatibility with DuckDB format)
  // Format: "host=... port=... user=... password=... database=..."
  const config: {
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
    ssl?: { rejectUnauthorized: boolean };
  } = {};

  const parts = connectionUrl.split(/\s+/);
  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    const value = valueParts.join('=');
    if (key && value) {
      switch (key.toLowerCase()) {
        case 'host':
          config.host = value;
          break;
        case 'port':
          config.port = Number(value) || 3306;
          break;
        case 'user':
        case 'username':
          config.user = value;
          break;
        case 'password':
          config.password = value;
          break;
        case 'database':
        case 'db':
          config.database = value;
          break;
        case 'ssl':
          if (value === 'true') {
            config.ssl = { rejectUnauthorized: false };
          }
          break;
      }
    }
  }

  return {
    user: config.user,
    password: config.password,
    host: config.host || 'localhost',
    port: config.port || 3306,
    database: config.database,
    ssl: config.ssl,
  };
}

export function makeMysqlDriver(context: DriverContext): IDataSourceDriver {
  const parsedConfig = schema.parse(context.config);
  const connectionUrl = extractConnectionUrl(parsedConfig as Record<string, unknown>, 'mysql');

  const withConnection = async <T>(
    config: { connectionUrl: string },
    callback: (connection: Connection) => Promise<T>,
    timeoutMs: number = DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  ): Promise<T> => {
    const connectionPromise = (async () => {
      const connection = await createConnection(buildMysqlConfig(config.connectionUrl));
      try {
        return await callback(connection);
      } finally {
        await connection.end();
      }
    })();

    return withTimeout(
      connectionPromise,
      timeoutMs,
      `MySQL connection operation timed out after ${timeoutMs}ms`,
    );
  };

  const collectColumns = (fields: Array<{ name: string; type: number }>) =>
    fields.map((field) => ({
      name: field.name,
      displayName: field.name,
      originalType: String(field.type),
    }));

  const queryStat = (rowCount: number | null) => ({
    rowsAffected: rowCount ?? 0,
    rowsRead: rowCount ?? 0,
    rowsWritten: 0,
    queryDurationMs: null,
  });

  return {
    async testConnection(): Promise<void> {
      await withConnection(
        { connectionUrl },
        async (connection) => {
          await connection.query('SELECT 1');
        },
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
      );
      context.logger?.info?.('mysql: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const rows = await withConnection({ connectionUrl }, async (connection) => {
        const [results] = await connection.query(`
          SELECT table_schema,
                 table_name,
                 column_name,
                 data_type,
                 ordinal_position,
                 is_nullable
          FROM information_schema.columns
          WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
            AND table_schema IS NOT NULL
            AND table_name IS NOT NULL
            AND column_name IS NOT NULL
            AND data_type IS NOT NULL
            AND ordinal_position IS NOT NULL
          ORDER BY table_schema, table_name, ordinal_position;
        `);
        return Array.isArray(results) ? results : [];
      });

      const getValue = (row: Record<string, unknown>, key: string): unknown => {
        return row[key] ?? row[key.toUpperCase()];
      };

      const normalizedRows = (rows as Array<Record<string, unknown>>).map((row) => ({
        table_schema: String(getValue(row, 'table_schema') ?? '').trim(),
        table_name: String(getValue(row, 'table_name') ?? '').trim(),
        column_name: String(getValue(row, 'column_name') ?? '').trim(),
        data_type: String(getValue(row, 'data_type') ?? '').trim(),
        ordinal_position: Number(getValue(row, 'ordinal_position') ?? 0),
        is_nullable: String(getValue(row, 'is_nullable') ?? 'NO').trim(),
      })).filter(
        (r) => r.table_schema && r.table_name && r.column_name && r.data_type && r.ordinal_position > 0,
      );

      return buildMetadataFromInformationSchema({
        driver: 'mysql',
        rows: normalizedRows,
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const startTime = Date.now();
      const result = await withConnection({ connectionUrl }, (connection) =>
        connection.query(sql),
      );
      const endTime = Date.now();

      // mysql2 returns [rows, fields] as a tuple
      const [rows, fields] = result as [unknown[], Array<{ name: string; type: number }>];
      const rowArray = Array.isArray(rows) ? rows : [];
      const fieldArray = Array.isArray(fields) ? fields : [];

      // Try to get affectedRows from the result if available
      const affectedRows =
        (result as unknown as { affectedRows?: number })?.affectedRows ?? rowArray.length;

      return {
        columns: collectColumns(fieldArray),
        rows: rowArray as Array<Record<string, unknown>>,
        stat: {
          rowsAffected: affectedRows,
          rowsRead: rowArray.length,
          rowsWritten: affectedRows,
          queryDurationMs: endTime - startTime,
        },
      };
    },

    async close() {
      context.logger?.info?.('mysql: closed');
    },
  };
}

// Expose a stable factory export for the runtime loader
export const driverFactory = makeMysqlDriver;
export default driverFactory;

