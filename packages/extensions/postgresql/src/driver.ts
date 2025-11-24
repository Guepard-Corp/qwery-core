import { Client } from 'pg';
import type { ConnectionOptions } from 'tls';

import type { DatasourceResultSet } from '@qwery/extensions-sdk';
import { DatasourceDriver } from '@qwery/extensions-sdk';

export interface PostgresDriverConfig extends Record<string, unknown> {
  connectionUrl: string;
}

export class PostgresDatasourceDriver extends DatasourceDriver {
  private readonly connectionUrl: string;

  constructor(name: string, config: PostgresDriverConfig | string) {
    super(name, config);
    if (typeof config === 'string') {
      this.connectionUrl = config;
    } else if (typeof config.connectionUrl === 'string') {
      this.connectionUrl = config.connectionUrl;
    } else {
      throw new Error('PostgreSQL driver requires a connectionUrl.');
    }
  }

  async getCurrentSchema(): Promise<string | null> {
    const rows = await this.withClient(async (client) => {
      const result = await client.query(`
        SELECT table_schema,
               table_name,
               column_name,
               data_type
        FROM information_schema.columns
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name, ordinal_position;
      `);
      return result.rows;
    });

    if (!rows.length) {
      return 'No tables found';
    }

    const grouped = new Map<string, string[]>();
    for (const row of rows) {
      const key = `${row.table_schema as string}.${row.table_name as string}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped
        .get(key)!
        .push(`${row.column_name as string} ${row.data_type as string}`);
    }

    return Array.from(grouped.entries())
      .map(([table, columns]) => `${table} (${columns.join(', ')})`)
      .join('\n');
  }

  async testConnection(): Promise<boolean> {
    await this.withClient(async (client) => {
      await client.query('SELECT 1');
    });
    return true;
  }

  async connect(): Promise<void> {
    // No persistent connection; handled per query.
  }

  close(): void {
    // No-op.
  }

  async query(query: string): Promise<DatasourceResultSet> {
    const { rows, rowCount } = await this.withClient(async (client) => {
      const result = await client.query(query);
      return {
        rows: result.rows as Array<Record<string, unknown>>,
        rowCount: result.rowCount ?? result.rows.length,
      };
    });

    const headers =
      rows.length > 0
        ? Object.keys(rows[0] as Record<string, unknown>).map((name) => ({
            name,
            displayName: name,
            originalType: null,
          }))
        : [];

    return {
      rows,
      headers,
      stat: {
        rowsAffected: rowCount,
        rowsRead: rowCount,
        rowsWritten: 0,
        queryDurationMs: null,
      },
    };
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
