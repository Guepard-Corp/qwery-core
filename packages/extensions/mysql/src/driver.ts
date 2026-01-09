import { createConnection, type Connection } from 'mysql2/promise';
import { z } from 'zod';

import type {
  DriverContext,
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import { DatasourceMetadataZodSchema } from '@qwery/extensions-sdk';
import { extractConnectionUrl } from '@qwery/extensions-sdk';

const ConfigSchema = z
  .object({
    connectionUrl: z.string().url().optional(),
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    username: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
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

export function makeMysqlDriver(context: DriverContext): IDataSourceDriver {
  const withConnection = async <T>(
    config: { connectionUrl: string },
    callback: (connection: Connection) => Promise<T>,
  ): Promise<T> => {
    const connection = await createConnection(buildMysqlConfig(config.connectionUrl));
    try {
      return await callback(connection);
    } finally {
      await connection.end();
    }
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
      await withConnection({ connectionUrl }, async (connection) => {
        await connection.query('SELECT 1');
      });
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
          ORDER BY table_schema, table_name, ordinal_position;
        `);
        return Array.isArray(results) 
          ? (results as Array<{
              table_schema: string;
              table_name: string;
              column_name: string;
              data_type: string;
              ordinal_position: number;
              is_nullable: string;
            }>)
          : [];
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

