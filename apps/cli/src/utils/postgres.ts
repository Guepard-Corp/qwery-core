import { Client } from 'pg';
import type { ConnectionOptions } from 'tls';

export interface QueryResultRow {
  [column: string]: unknown;
}

interface RunQueryResult {
  rows: QueryResultRow[];
  rowCount: number;
}

function buildPgConfig(connectionString: string) {
  const url = new URL(connectionString);
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

async function withInsecureTls<T>(callback: () => Promise<T>): Promise<T> {
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    return await callback();
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
    }
  }
}

export async function testPostgresConnection(connectionString: string) {
  const client = new Client(buildPgConfig(connectionString));
  await withInsecureTls(async () => {
    try {
      await client.connect();
      await client.query('SELECT 1');
    } finally {
      await client.end().catch(() => undefined);
    }
  });
}

export async function runPostgresQuery(
  connectionString: string,
  sql: string,
): Promise<RunQueryResult> {
  const client = new Client(buildPgConfig(connectionString));
  return await withInsecureTls(async () => {
    try {
      await client.connect();
      const result = await client.query(sql);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  });
}

export async function describePostgresSchema(
  connectionString: string,
): Promise<string> {
  const client = new Client(buildPgConfig(connectionString));
  return await withInsecureTls(async () => {
    try {
      await client.connect();
      const result = await client.query(`
      SELECT table_schema,
             table_name,
             column_name,
             data_type
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    if (result.rows.length === 0) {
      return 'No tables found';
    }

    const grouped = new Map<string, string[]>();
    for (const row of result.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
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
    } finally {
      await client.end().catch(() => undefined);
    }
  });
}

