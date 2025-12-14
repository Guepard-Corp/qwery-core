import { Client } from 'pg';
import type { ConnectionOptions } from 'tls';
import { z } from 'zod';

import type {
  IDataSourceDriver,
  DatasourceResultSet,
  DatasourceMetadata,
} from '@qwery/extensions-sdk';
import { DatasourceMetadataZodSchema } from '@qwery/extensions-sdk';

const PostgresDriverConfigSchema = z.object({
  connectionUrl: z.string().url(),
});

type PostgresDriverConfig = z.infer<typeof PostgresDriverConfigSchema>;

export class PostgresDatasourceDriver implements IDataSourceDriver {
  private readonly name: string;
  private readonly connectionUrl: string;

  constructor(name: string, config: PostgresDriverConfig | string) {
    this.name = name;
    if (typeof config === 'string') {
      this.connectionUrl = config;
    } else if (
      typeof config === 'object' &&
      typeof config.connectionUrl === 'string'
    ) {
      this.connectionUrl = config.connectionUrl;
    } else {
      throw new Error('PostgreSQL driver requires a connectionUrl.');
    }
  }

  async testConnection(config: unknown): Promise<void> {
    PostgresDriverConfigSchema.parse(config);
    await this.withClient(async (client) => {
      await client.query('SELECT 1');
    });
  }

  async query(sql: string, config: unknown): Promise<DatasourceResultSet> {
    PostgresDriverConfigSchema.parse(config);
    const startTime = performance.now();

    const { rows, rowCount } = await this.withClient(async (client) => {
      const result = await client.query(sql);
      return {
        rows: result.rows as Array<Record<string, unknown>>,
        rowCount: result.rowCount ?? result.rows.length,
      };
    });

    const endTime = performance.now();

    const columns =
      rows.length > 0
        ? Object.keys(rows[0] as Record<string, unknown>).map((name) => ({
            name,
            displayName: name,
            originalType: null,
          }))
        : [];

    return {
      columns,
      rows,
      stat: {
        rowsAffected: rowCount,
        rowsRead: rowCount,
        rowsWritten: 0,
        queryDurationMs: endTime - startTime,
      },
    };
  }

  async metadata(config: unknown): Promise<DatasourceMetadata> {
    PostgresDriverConfigSchema.parse(config);
    const rows = await this.withClient(async (client) => {
      const result = await client.query<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        ordinal_position: number;
        is_nullable: string;
        character_maximum_length: number | null;
        numeric_precision: number | null;
        numeric_scale: number | null;
      }>(`
        SELECT 
          table_schema,
          table_name,
          column_name,
          data_type,
          ordinal_position,
          is_nullable,
          character_maximum_length,
          numeric_precision,
          numeric_scale
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
      charMaxLength: number | null,
      numericPrecision: number | null,
      numericScale: number | null,
    ) => {
      let format = dataType;
      if (charMaxLength) {
        format = `${dataType}(${charMaxLength})`;
      } else if (numericPrecision !== null && numericScale !== null) {
        format = `${dataType}(${numericPrecision},${numericScale})`;
      } else if (numericPrecision !== null) {
        format = `${dataType}(${numericPrecision})`;
      }

      return {
        id: `${schema}.${table}.${name}`,
        table_id: 0,
        schema,
        table,
        name,
        ordinal_position: ordinal,
        data_type: dataType,
        format,
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
      };
    };

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
          row.character_maximum_length,
          row.numeric_precision,
          row.numeric_scale,
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
  }

  async close(): Promise<void> {
    // No-op for PostgreSQL driver (connections are per-query)
  }

  private buildPgConfig() {
    const url = new URL(this.connectionUrl);
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
      database: url.pathname
        ? url.pathname.replace(/^\//, '') || undefined
        : undefined,
      ssl,
    };
  }

  private async withClient<T>(
    callback: (client: Client) => Promise<T>,
  ): Promise<T> {
    const client = new Client(this.buildPgConfig());
    try {
      await client.connect();
      return await callback(client);
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}
