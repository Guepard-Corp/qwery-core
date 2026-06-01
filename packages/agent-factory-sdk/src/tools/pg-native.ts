import type { Datasource } from '@qwery/domain';
import { Client } from 'pg';

/**
 * Native PostgreSQL access for audit tools that need the REAL Postgres planner.
 *
 * The audit tools normally run through the in-memory DuckDB compute (which
 * ATTACHes the source via the postgres extension). DuckDB intercepts `EXPLAIN`
 * and plans it in its OWN engine, so the result is a DuckDB plan whose leaf is a
 * generic `POSTGRES_SCAN` — never real Postgres nodes (`Index Scan`, costs,
 * `Index Cond`). DuckDB's `postgres_query()` cannot run `EXPLAIN` either (it
 * wraps the SQL in a `COPY (SELECT … FROM (<sql>))`, which Postgres rejects).
 * So a plan with genuine Postgres node/cost info requires a direct connection
 * to the source database, which is what this module provides.
 */

/** Build a `postgresql://` connection URL from a (revealed) datasource config. */
export function postgresConnectionUrl(config: Record<string, unknown>): string {
  const configuredUrl = config.connectionUrl ?? config.url;
  if (typeof configuredUrl === 'string' && configuredUrl.trim()) return configuredUrl.trim();
  const host = typeof config.host === 'string' ? config.host : '';
  if (!host) throw new Error('PostgreSQL datasource requires connectionUrl or host in config.');
  const port =
    typeof config.port === 'number' || typeof config.port === 'string' ? String(config.port) : '5432';
  const database = typeof config.database === 'string' ? config.database : 'postgres';
  const username = typeof config.username === 'string' ? encodeURIComponent(config.username) : '';
  const password = typeof config.password === 'string' ? `:${encodeURIComponent(config.password)}` : '';
  const auth = username ? `${username}${password}@` : '';
  const sslmode = config.ssl === true ? '?sslmode=require' : '';
  return `postgresql://${auth}${host}:${port}/${encodeURIComponent(database)}${sslmode}`;
}

export interface NativePgDeps {
  /** Resolve the attached datasource the audit is running against. */
  getAttachedDatasource?: () => Promise<Datasource | null>;
  /** Reveal encrypted datasource config to obtain a native connection URL. */
  revealDatasourceSecrets?: (datasource: Datasource) => Promise<Record<string, unknown>>;
}

/**
 * Resolve a source PostgreSQL connection URL from the attached datasource, or
 * `null` when no datasource is attached / it isn't PostgreSQL / the accessors
 * are unwired. A `null` lets callers fall back to the DuckDB plan instead of
 * failing the tool outright.
 */
export async function resolveSourcePostgresUrl(deps: NativePgDeps): Promise<string | null> {
  if (!deps.getAttachedDatasource) return null;
  const datasource = await deps.getAttachedDatasource();
  if (!datasource || !/^postgres(ql)?$/i.test(datasource.datasource_provider)) return null;
  const config = deps.revealDatasourceSecrets
    ? await deps.revealDatasourceSecrets(datasource)
    : (datasource.config as Record<string, unknown>);
  return postgresConnectionUrl(config);
}

/** Per-statement ceiling so a pathological plan/connection can't hang the turn. */
const EXPLAIN_STATEMENT_TIMEOUT_MS = 15_000;
const CONNECT_TIMEOUT_MS = 10_000;

function clientConfig(connectionUrl: string) {
  // `pg` reads most of the URL, but sslmode=require needs an explicit ssl object.
  const ssl = /[?&]sslmode=require\b/.test(connectionUrl) ? { rejectUnauthorized: false } : undefined;
  return {
    connectionString: connectionUrl,
    ssl,
    statement_timeout: EXPLAIN_STATEMENT_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  };
}

function planFromExplainRow(rows: Array<Record<string, unknown>>): unknown {
  // `EXPLAIN (FORMAT JSON)` returns one row, column "QUERY PLAN". The `pg`
  // driver decodes a json column to a JS value already, but tolerate a string.
  const cell = rows[0]?.['QUERY PLAN'];
  return typeof cell === 'string' ? JSON.parse(cell) : cell;
}

/**
 * Run `EXPLAIN (FORMAT JSON, BUFFERS)` (NO `ANALYZE` — the query is never
 * executed) against the source PostgreSQL for one or more already-validated
 * SELECT/WITH statements, returning each parsed plan in input order. The
 * session is forced read-only as defence in depth.
 */
export async function explainOnSourcePostgres(
  connectionUrl: string,
  statements: string[],
): Promise<unknown[]> {
  const client = new Client(clientConfig(connectionUrl));
  await client.connect();
  try {
    await client.query('SET default_transaction_read_only = on');
    const plans: unknown[] = [];
    for (const sql of statements) {
      const res = await client.query(`EXPLAIN (FORMAT JSON, BUFFERS) ${sql}`);
      plans.push(planFromExplainRow(res.rows));
    }
    return plans;
  } finally {
    await client.end();
  }
}
