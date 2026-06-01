import type { Compute, Datasource, QueryResult, QuerySchema } from '@qwery/domain';
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
/** Ad-hoc audit reads can be heavier than an EXPLAIN, but must still be bounded. */
const QUERY_STATEMENT_TIMEOUT_MS = 30_000;

/** Minimal PostgreSQL type-OID → name map for describe output (best-effort). */
const PG_TYPE_BY_OID: Record<number, string> = {
  16: 'bool',
  20: 'int8',
  21: 'int2',
  23: 'int4',
  25: 'text',
  114: 'json',
  700: 'float4',
  701: 'float8',
  1042: 'bpchar',
  1043: 'varchar',
  1082: 'date',
  1114: 'timestamp',
  1184: 'timestamptz',
  1700: 'numeric',
  2950: 'uuid',
  3802: 'jsonb',
};

function clientConfig(connectionUrl: string, statementTimeoutMs: number = EXPLAIN_STATEMENT_TIMEOUT_MS) {
  // `pg` reads most of the URL, but sslmode=require needs an explicit ssl object.
  const ssl = /[?&]sslmode=require\b/.test(connectionUrl) ? { rejectUnauthorized: false } : undefined;
  return {
    connectionString: connectionUrl,
    ssl,
    statement_timeout: statementTimeoutMs,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  };
}

function planFromExplainRow(rows: Array<Record<string, unknown>>): unknown {
  // `EXPLAIN (FORMAT JSON)` returns one row, column "QUERY PLAN". The `pg`
  // driver decodes a json column to a JS value already, but tolerate a string.
  const cell = rows[0]?.['QUERY PLAN'];
  return typeof cell === 'string' ? JSON.parse(cell) : cell;
}

export interface ExplainOptions {
  /**
   * Run `EXPLAIN (ANALYZE, …)`: actually execute each SELECT/WITH and capture
   * real node timings/row counts (no row *data* is returned, only the plan).
   * Off by default — plan/cost estimates only, query never executed.
   */
  analyze?: boolean;
}

/**
 * Run `EXPLAIN (FORMAT JSON, BUFFERS)` against the source PostgreSQL for one or
 * more already-validated SELECT/WITH statements, returning each parsed plan in
 * input order. With `{ analyze: true }` it runs `EXPLAIN (ANALYZE, BUFFERS,
 * FORMAT JSON)` so the plan carries measured execution time — the queries are
 * executed, but only the plan (timings/counts, never row data) is returned. The
 * session is forced read-only as defence in depth.
 */
export async function explainOnSourcePostgres(
  connectionUrl: string,
  statements: string[],
  options: ExplainOptions = {},
): Promise<unknown[]> {
  const analyze = options.analyze === true;
  const prefix = analyze ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)' : 'EXPLAIN (FORMAT JSON, BUFFERS)';
  // ANALYZE executes the query, so allow the heavier query budget.
  const timeout = analyze ? QUERY_STATEMENT_TIMEOUT_MS : EXPLAIN_STATEMENT_TIMEOUT_MS;
  const client = new Client(clientConfig(connectionUrl, timeout));
  await client.connect();
  try {
    await client.query('SET default_transaction_read_only = on');
    const plans: unknown[] = [];
    for (const sql of statements) {
      const res = await client.query(`${prefix} ${sql}`);
      plans.push(planFromExplainRow(res.rows));
    }
    return plans;
  } finally {
    await client.end();
  }
}

/**
 * Execute one read-only statement against the source PostgreSQL and return it in
 * the `Compute` result shape. The session is forced read-only as defence in
 * depth; callers (runQuery/present) still apply their own SQL/privacy guards.
 */
export async function runSqlOnSourcePostgres(connectionUrl: string, sql: string): Promise<QueryResult> {
  const client = new Client(clientConfig(connectionUrl, QUERY_STATEMENT_TIMEOUT_MS));
  const start = Date.now();
  await client.connect();
  try {
    await client.query('SET default_transaction_read_only = on');
    const res = await client.query(sql);
    const columns = (res.fields ?? []).map((f) => f.name);
    const rows = (res.rows ?? []) as QueryResult['rows'];
    return { columns, rows, rowCount: res.rowCount ?? rows.length, durationMs: Date.now() - start };
  } finally {
    await client.end();
  }
}

/**
 * Return a statement's output columns from the source PostgreSQL without
 * exposing row data: the query is wrapped in `... LIMIT 0`, so the driver
 * reports field descriptors while zero rows are returned.
 */
export async function describeSqlOnSourcePostgres(connectionUrl: string, sql: string): Promise<QuerySchema> {
  const client = new Client(clientConfig(connectionUrl, QUERY_STATEMENT_TIMEOUT_MS));
  await client.connect();
  try {
    await client.query('SET default_transaction_read_only = on');
    const res = await client.query(`SELECT * FROM (${sql}) AS _qwery_describe LIMIT 0`);
    return {
      columns: (res.fields ?? []).map((f) => ({
        name: f.name,
        type: PG_TYPE_BY_OID[f.dataTypeID] ?? `oid:${f.dataTypeID}`,
      })),
    };
  } finally {
    await client.end();
  }
}

/** Injectable executors so the routing in {@link createSourceAwareCompute} can be tested without a real database. */
export interface SourcePostgresExecutors {
  runSql: (connectionUrl: string, sql: string) => Promise<QueryResult>;
  describeSql: (connectionUrl: string, sql: string) => Promise<QuerySchema>;
}

const DEFAULT_EXECUTORS: SourcePostgresExecutors = {
  runSql: runSqlOnSourcePostgres,
  describeSql: describeSqlOnSourcePostgres,
};

/**
 * A `Compute` that runs against the source PostgreSQL when one is attached, and
 * otherwise delegates to `fallback` (the in-memory DuckDB compute). This lets
 * PostgreSQL-specialist agents run their ad-hoc `runQuery`/`present` SQL —
 * including catalog functions DuckDB lacks (`pg_database_size`,
 * `pg_stat_activity`, …) — on the real engine. Non-PostgreSQL datasources keep
 * using `fallback`. Privacy is unchanged: the caller still validates the SQL and
 * controls what reaches the LLM.
 */
export function createSourceAwareCompute(
  fallback: Compute,
  native: NativePgDeps,
  executors: SourcePostgresExecutors = DEFAULT_EXECUTORS,
): Compute {
  return {
    async runSql(sql: string): Promise<QueryResult> {
      const url = await resolveSourcePostgresUrl(native);
      return url ? executors.runSql(url, sql) : fallback.runSql(sql);
    },
    async describeSql(sql: string): Promise<QuerySchema> {
      const url = await resolveSourcePostgresUrl(native);
      return url ? executors.describeSql(url, sql) : fallback.describeSql(sql);
    },
  };
}
