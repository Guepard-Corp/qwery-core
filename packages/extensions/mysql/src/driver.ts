import { createConnection, type Connection } from 'mysql2/promise';
import { z } from 'zod/v3';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
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
    ssl: z.boolean().optional(),
  })
  .refine(
    (data) => data.connectionUrl || data.host,
    {
      message: 'Either connectionUrl or host must be provided',
    },
  );

type DriverConfig = z.infer<typeof ConfigSchema>;

export function buildMysqlConfigFromFields(fields: DriverConfig) {
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
    async testConnection(config: unknown): Promise<void> {
      const parsed = ConfigSchema.parse(config);
      const connectionUrl = extractConnectionUrl(
        parsed as Record<string, unknown>,
        'mysql',
      );
      await withConnection(
        { connectionUrl },
        async (connection) => {
          await connection.query('SELECT 1');
        },
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
      );
      context.logger?.info?.('mysql: testConnection ok');
    },

    async metadata(config: unknown): Promise<DatasourceMetadata> {
      const parsed = ConfigSchema.parse(config);
      const connectionUrl = extractConnectionUrl(
        parsed as Record<string, unknown>,
        'mysql',
      );
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

      const tableMap = new Map<string, { id: number; schema: string; name: string; columns: Array<{ id: string; schema: string; table: string; name: string; ordinal_position: number; data_type: string; format: string; is_nullable: boolean }> }>();
      let tableId = 1;

      for (const row of rows as Array<Record<string, unknown>>) {
        const schema = String(getValue(row, 'table_schema') ?? '').trim();
        const tableName = String(getValue(row, 'table_name') ?? '').trim();
        const columnName = String(getValue(row, 'column_name') ?? '').trim();
        const dataType = String(getValue(row, 'data_type') ?? '').trim();
        const ordinal = Number(getValue(row, 'ordinal_position') ?? 0);
        const isNullable = String(getValue(row, 'is_nullable') ?? 'NO').trim() === 'YES';

        if (!schema || !tableName || !columnName || !dataType || ordinal <= 0) {
          continue;
        }

        const key = `${schema}.${tableName}`;
        if (!tableMap.has(key)) {
          tableMap.set(key, {
            id: tableId++,
            schema,
            name: tableName,
            columns: [],
          });
        }

        tableMap.get(key)!.columns.push({
          id: `${schema}.${tableName}.${columnName}`,
          schema,
          table: tableName,
          name: columnName,
          ordinal_position: ordinal,
          data_type: dataType,
          format: dataType,
          is_nullable: isNullable,
        });
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
          id: column.id,
          table_id: table.id,
          schema: column.schema,
          table: column.table,
          name: column.name,
          ordinal_position: column.ordinal_position,
          data_type: column.data_type,
          format: column.format,
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: column.is_nullable,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        })),
      );

      const schemas = Array.from(new Set(Array.from(tableMap.values()).map((t) => t.schema))).map(
        (name, idx) => ({
          id: idx + 1,
          name,
          owner: 'unknown',
        }),
      );

      return DatasourceMetadataZodSchema.parse({
        version: '0.0.1',
        driver: 'mysql',
        schemas,
        tables,
        columns,
      });
    },

    async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
      const parsed = ConfigSchema.parse(config);
      const connectionUrl = extractConnectionUrl(
        parsed as Record<string, unknown>,
        'mysql',
      );
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

