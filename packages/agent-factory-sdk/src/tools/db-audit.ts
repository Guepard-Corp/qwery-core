import { type Compute, validateAggregateOnly } from '@qwery/domain';
import { tool } from 'ai';
import { z } from 'zod';
import {
  explainOnSourcePostgres,
  type NativePgDeps,
  resolveSourcePostgresUrl,
  runSqlOnSourcePostgres,
} from './pg-native';
import type { Track } from './track';

const WRITE_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|VACUUM|COPY|MERGE|CALL|DO)\b/i;

/**
 * EXPLAIN prefix for the audit's plan-inspection tools. These run through the
 * in-memory DuckDB compute (which proxies to the real engine via extensions),
 * and DuckDB's EXPLAIN does NOT support the `BUFFERS` option — passing it fails
 * with "Unimplemented explain type: buffers". `(FORMAT JSON)` is supported and
 * yields a machine-readable plan. (The GFS validator runs its own
 * `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` via psql against real PostgreSQL.)
 */
const EXPLAIN_JSON = 'EXPLAIN (FORMAT JSON)';

export interface DbAuditToolDeps {
  compute: Compute;
  track: Track;
}

function assertReadOnlySql(sql: string): void {
  const normalized = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n\r]*/g, ' ')
    .trim();
  if (!normalized) throw new Error('SQL query cannot be empty.');
  const statements = normalized
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  if (statements.length !== 1) throw new Error('Only one SQL statement is allowed per audit tool call.');
  const statement = statements[0] ?? '';
  if (!/^(SELECT|WITH|EXPLAIN|SHOW)\b/i.test(statement)) {
    throw new Error('Only read-only SQL statements are allowed in audit tools.');
  }
  if (WRITE_KEYWORDS.test(statement))
    throw new Error('Write-capable SQL keywords are blocked in audit tools.');
  if (/^EXPLAIN\b/i.test(statement)) {
    const target = statement
      .replace(/^EXPLAIN\b/i, '')
      .replace(/^\s*\([^)]*\)/, '')
      .trim();
    if (!/^(SELECT|WITH)\b/i.test(target))
      throw new Error('EXPLAIN is only allowed for SELECT/WITH statements.');
  }
}

async function safeRun(compute: Compute, sql: string) {
  assertReadOnlySql(sql);
  return compute.runSql(sql);
}

function q(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function qualifyTable(compute: Compute, schema: string, table: string): Promise<string> {
  const lookup = await safeRun(
    compute,
    `SELECT table_catalog, table_schema, table_name
       FROM information_schema.tables
      WHERE table_schema = '${schema.replaceAll("'", "''")}'
        AND table_name = '${table.replaceAll("'", "''")}'
      ORDER BY CASE WHEN table_catalog = current_database() THEN 0 ELSE 1 END, table_catalog
      LIMIT 1`,
  );
  const row = lookup.rows[0];
  const catalogName = typeof row?.table_catalog === 'string' ? row.table_catalog : null;
  const schemaName = typeof row?.table_schema === 'string' ? row.table_schema : schema;
  const tableName = typeof row?.table_name === 'string' ? row.table_name : table;
  return catalogName
    ? `${q(catalogName)}.${q(schemaName)}.${q(tableName)}`
    : `${q(schemaName)}.${q(tableName)}`;
}

function auditResult(toolName: Parameters<Track>[0], summary: string, result: unknown) {
  return {
    ui: { kind: 'dbAudit' as const, tool: toolName, summary, result },
    llm: { ok: true as const, summary, result },
  };
}

function limit(value: number, fallback: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
}

export function createDetectDbEngineTool({ compute, track }: DbAuditToolDeps) {
  return tool({
    description:
      'Detect PostgreSQL engine/version for the attached datasource using metadata-only server functions.',
    inputSchema: z.object({}),
    execute: async () =>
      track('detectDbEngine', {}, async () => {
        const pgSettings = await qualifyTable(compute, 'pg_catalog', 'pg_settings');
        const result = await safeRun(
          compute,
          `SELECT name, setting FROM ${pgSettings} WHERE name = 'server_version'`,
        );
        return auditResult('detectDbEngine', 'Detected database engine/version.', {
          columns: result.columns,
          rows: result.rows,
        });
      }),
  });
}

export function createGetTopSlowQueriesTool({ compute, track }: DbAuditToolDeps) {
  return tool({
    description:
      'Collect top PostgreSQL read-query candidates from pg_stat_statements. Returns query text plus aggregate timings/calls only.',
    inputSchema: z.object({ limit: z.number().int().positive().max(50).default(10) }),
    execute: async ({ limit: rawLimit }) =>
      track('getTopSlowQueries', { limit: rawLimit }, async () => {
        const rowLimit = limit(rawLimit, 10, 50);
        const pgStatStatements = await qualifyTable(compute, 'public', 'pg_stat_statements');
        const result = await safeRun(
          compute,
          `SELECT COALESCE(queryid::text, 'unknown') AS query_id,
                  LEFT(regexp_replace(query, '\\s+', ' ', 'g'), 4000) AS query_text,
                  calls,
                  total_exec_time AS total_exec_time_ms,
                  mean_exec_time AS mean_exec_time_ms,
                  rows,
                  CASE WHEN calls > 0 THEN ROUND((rows::numeric / calls), 2) ELSE NULL END AS rows_per_call,
                  shared_blks_hit,
                  shared_blks_read,
                  temp_blks_written
            FROM ${pgStatStatements}
            WHERE query IS NOT NULL
              AND (
                LOWER(TRIM(query)) LIKE 'select%'
                OR LOWER(TRIM(query)) LIKE 'with%'
              )
              AND query NOT ILIKE '%pg_stat_statements%'
            ORDER BY total_exec_time DESC, mean_exec_time DESC
            LIMIT ${rowLimit}`,
        );
        return auditResult(
          'getTopSlowQueries',
          `Collected ${result.rowCount} slow-query candidate(s).`,
          result.rows,
        );
      }),
  });
}

export function createExplainQueryPlanTool({ compute, track, ...native }: DbAuditToolDeps & NativePgDeps) {
  return tool({
    description:
      'Inspect the source PostgreSQL plan for a SELECT/WITH query. By default runs EXPLAIN (FORMAT JSON, BUFFERS) — plan/cost only, query NOT executed. Pass `analyze: true` to run EXPLAIN (ANALYZE, BUFFERS) and capture measured execution time/row counts (executes the query; no row data is returned). Returns real Postgres plan nodes.',
    inputSchema: z.object({
      sql: z.string().describe('A SELECT or WITH query to explain.'),
      analyze: z
        .boolean()
        .default(false)
        .describe('Execute the query to capture real timings (EXPLAIN ANALYZE). Default false (plan only).'),
    }),
    execute: async ({ sql, analyze }) =>
      track('explainQueryPlan', { sql }, async () => {
        assertReadOnlySql(sql);
        if (!/^(SELECT|WITH)\b/i.test(sql.trim()))
          throw new Error('explainQueryPlan only accepts SELECT/WITH input.');
        const url = await resolveSourcePostgresUrl(native);
        if (url) {
          const [plan] = await explainOnSourcePostgres(url, [sql], { analyze });
          return auditResult(
            'explainQueryPlan',
            analyze
              ? 'Captured PostgreSQL EXPLAIN ANALYZE plan (measured).'
              : 'Captured PostgreSQL EXPLAIN plan.',
            plan,
          );
        }
        // No native PostgreSQL connection available — fall back to the DuckDB
        // plan (real Postgres nodes/costs are unavailable on this path).
        const result = await safeRun(compute, `${EXPLAIN_JSON} ${sql}`);
        return auditResult(
          'explainQueryPlan',
          'Captured query plan (DuckDB compute; not the PostgreSQL planner).',
          result.rows,
        );
      }),
  });
}

export function createCompareQueryRewriteTool({ compute, track, ...native }: DbAuditToolDeps & NativePgDeps) {
  return tool({
    description:
      'Compare original vs rewritten SELECT/WITH queries on the source PostgreSQL. By default runs EXPLAIN ANALYZE on both (executes them) so you get a MEASURED before/after diff — real execution times, row counts and buffers. Pass `analyze: false` for very expensive queries to compare plan/cost estimates only (no execution). No row data is returned.',
    inputSchema: z.object({
      originalSql: z.string(),
      rewrittenSql: z.string(),
      analyze: z
        .boolean()
        .default(true)
        .describe(
          'Execute both queries to measure real before/after timing (EXPLAIN ANALYZE). Set false for plan/cost-only comparison on queries too expensive to run.',
        ),
    }),
    execute: async ({ originalSql, rewrittenSql, analyze }) =>
      track('compareQueryRewrite', { originalSql, rewrittenSql }, async () => {
        for (const sql of [originalSql, rewrittenSql]) {
          assertReadOnlySql(sql);
          if (!/^(SELECT|WITH)\b/i.test(sql.trim()))
            throw new Error('compareQueryRewrite only accepts SELECT/WITH input.');
        }
        const url = await resolveSourcePostgresUrl(native);
        if (url) {
          const [originalPlan, rewrittenPlan] = await explainOnSourcePostgres(
            url,
            [originalSql, rewrittenSql],
            { analyze },
          );
          return auditResult(
            'compareQueryRewrite',
            analyze
              ? 'Captured measured original vs rewritten PostgreSQL EXPLAIN ANALYZE plans.'
              : 'Captured original and rewritten PostgreSQL EXPLAIN plans (estimates only).',
            { originalPlan, rewrittenPlan },
          );
        }
        const [original, rewritten] = await Promise.all([
          safeRun(compute, `${EXPLAIN_JSON} ${originalSql}`),
          safeRun(compute, `${EXPLAIN_JSON} ${rewrittenSql}`),
        ]);
        return auditResult(
          'compareQueryRewrite',
          'Captured original and rewritten query plans (DuckDB compute; not the PostgreSQL planner).',
          { originalPlan: original.rows, rewrittenPlan: rewritten.rows },
        );
      }),
  });
}

function catalogTool(
  name: Parameters<Track>[0],
  description: string,
  buildSql: (compute: Compute) => Promise<string>,
  summary: string,
) {
  return ({ compute, track }: DbAuditToolDeps) =>
    tool({
      description,
      inputSchema: z.object({}),
      execute: async () =>
        track(name, {}, async () => {
          const result = await safeRun(compute, await buildSql(compute));
          return auditResult(name, summary, result.rows);
        }),
    });
}

export const createGetIndexHealthTool = catalogTool(
  'getIndexHealth',
  'Inspect PostgreSQL index usage and invalid indexes from catalog statistics.',
  async (
    compute,
  ) => `SELECT schemaname, relname AS table_name, indexrelname AS index_name, idx_scan, idx_tup_read, idx_tup_fetch
     FROM ${await qualifyTable(compute, 'pg_catalog', 'pg_stat_user_indexes')}
    ORDER BY idx_scan ASC, idx_tup_read DESC
    LIMIT 100`,
  'Collected index health signals.',
);

export const createGetTableHealthTool = catalogTool(
  'getTableHealth',
  'Inspect PostgreSQL table vacuum/analyze and scan counters from pg_stat_user_tables.',
  async (
    compute,
  ) => `SELECT schemaname, relname AS table_name, n_live_tup, n_dead_tup, seq_scan, idx_scan, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
     FROM ${await qualifyTable(compute, 'pg_catalog', 'pg_stat_user_tables')}
    ORDER BY n_dead_tup DESC, seq_scan DESC
    LIMIT 100`,
  'Collected table health signals.',
);

export const createGetInfraRuntimeSignalsTool = catalogTool(
  'getInfraRuntimeSignals',
  'Read PostgreSQL runtime settings relevant to query performance.',
  async (compute) => `SELECT name, setting, unit, source
     FROM ${await qualifyTable(compute, 'pg_catalog', 'pg_settings')}
    WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'effective_cache_size', 'max_connections', 'random_page_cost', 'effective_io_concurrency')
    ORDER BY name`,
  'Collected runtime configuration signals.',
);

export const createGetRecentDbLogsTool = catalogTool(
  'getRecentDbLogs',
  'Return log availability metadata. PostgreSQL logs are often filesystem-managed and unavailable via SQL.',
  async (compute) =>
    `SELECT name, setting FROM ${await qualifyTable(compute, 'pg_catalog', 'pg_settings')} WHERE name IN ('log_destination', 'logging_collector', 'log_directory', 'log_filename') ORDER BY name`,
  'Collected database log configuration metadata.',
);

export const createGetLockAndBlockingAnalysisTool = catalogTool(
  'getLockAndBlockingAnalysis',
  'Inspect active PostgreSQL lock waits and blockers without exposing table rows.',
  async (compute) => {
    const pgLocks = await qualifyTable(compute, 'pg_catalog', 'pg_locks');
    const pgStatActivity = await qualifyTable(compute, 'pg_catalog', 'pg_stat_activity');
    return `SELECT blocked.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          blocking.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocked.mode AS blocked_mode,
          blocked_activity.wait_event_type,
          blocked_activity.wait_event
     FROM ${pgLocks} blocked
     JOIN ${pgStatActivity} blocked_activity ON blocked_activity.pid = blocked.pid
     JOIN ${pgLocks} blocking ON blocking.locktype = blocked.locktype
       AND blocking.database IS NOT DISTINCT FROM blocked.database
       AND blocking.relation IS NOT DISTINCT FROM blocked.relation
       AND blocking.page IS NOT DISTINCT FROM blocked.page
       AND blocking.tuple IS NOT DISTINCT FROM blocked.tuple
       AND blocking.virtualxid IS NOT DISTINCT FROM blocked.virtualxid
       AND blocking.transactionid IS NOT DISTINCT FROM blocked.transactionid
       AND blocking.classid IS NOT DISTINCT FROM blocked.classid
       AND blocking.objid IS NOT DISTINCT FROM blocked.objid
       AND blocking.objsubid IS NOT DISTINCT FROM blocked.objsubid
       AND blocking.pid <> blocked.pid
     JOIN ${pgStatActivity} blocking_activity ON blocking_activity.pid = blocking.pid
    WHERE NOT blocked.granted AND blocking.granted
    LIMIT 100`;
  },
  'Collected lock and blocking signals.',
);

export const createGetStatisticsHealthTool = catalogTool(
  'getStatisticsHealth',
  'Inspect table statistics freshness from pg_stat_user_tables.',
  async (
    compute,
  ) => `SELECT schemaname, relname AS table_name, last_analyze, last_autoanalyze, analyze_count, autoanalyze_count, n_mod_since_analyze
     FROM ${await qualifyTable(compute, 'pg_catalog', 'pg_stat_user_tables')}
    ORDER BY n_mod_since_analyze DESC
    LIMIT 100`,
  'Collected statistics freshness signals.',
);

// Per-table bloat with absolute sizes — requires native Postgres size functions
// (pg_total_relation_size), which DuckDB federation does not expose.
const BLOAT_TABLES_SQL_PG = `SELECT schemaname, relname AS table_name, n_live_tup, n_dead_tup,
        CASE WHEN n_live_tup + n_dead_tup > 0 THEN ROUND((n_dead_tup::numeric / (n_live_tup + n_dead_tup)) * 100, 2) ELSE 0 END AS dead_tuple_pct,
        pg_total_relation_size(relid) AS size_bytes,
        CASE WHEN n_live_tup + n_dead_tup > 0
             THEN ROUND(pg_total_relation_size(relid) * (n_dead_tup::numeric / (n_live_tup + n_dead_tup)))
             ELSE 0 END AS estimated_dead_tuple_bytes
   FROM pg_stat_user_tables
  ORDER BY size_bytes DESC NULLS LAST
  LIMIT 100`;

const BLOAT_SUMMARY_SQL_PG = `SELECT pg_database_size(current_database()) AS database_bytes,
        (SELECT count(*) FROM pg_stat_user_tables) AS user_table_count,
        (SELECT count(*) FROM pg_stat_user_indexes) AS user_index_count`;

/**
 * Bloat risk plus a database size summary. On native PostgreSQL it returns
 * per-table absolute sizes and `dbSummary` (database bytes, user table/index
 * counts) the audit report's Audit Context and bloat sections need — these rely
 * on `pg_database_size`/`pg_total_relation_size`, which the DuckDB federation
 * cannot run. Without a native connection it falls back to dead-tuple ratios
 * plus catalog counts (sizes omitted).
 */
export function createGetBloatEstimatesTool({ compute, track, ...native }: DbAuditToolDeps & NativePgDeps) {
  return tool({
    description:
      'Estimate table bloat (dead-tuple ratios) and report a database size summary: per-table sizes, estimated dead-tuple bytes, and DB-wide table/index counts and total bytes. Sizes require the native PostgreSQL connection.',
    inputSchema: z.object({}),
    execute: async () =>
      track('getBloatEstimates', {}, async () => {
        const url = await resolveSourcePostgresUrl(native);
        if (url) {
          const [summary, tables] = await Promise.all([
            runSqlOnSourcePostgres(url, BLOAT_SUMMARY_SQL_PG),
            runSqlOnSourcePostgres(url, BLOAT_TABLES_SQL_PG),
          ]);
          return auditResult('getBloatEstimates', 'Collected bloat risk estimates and size summary.', {
            dbSummary: summary.rows[0] ?? {},
            tables: tables.rows,
          });
        }
        // DuckDB fallback: dead-tuple ratios + catalog counts; sizes unavailable.
        const pgStatTables = await qualifyTable(compute, 'pg_catalog', 'pg_stat_user_tables');
        const pgStatIndexes = await qualifyTable(compute, 'pg_catalog', 'pg_stat_user_indexes');
        const [summary, tables] = await Promise.all([
          safeRun(
            compute,
            `SELECT (SELECT count(*) FROM ${pgStatTables}) AS user_table_count,
                    (SELECT count(*) FROM ${pgStatIndexes}) AS user_index_count`,
          ),
          safeRun(
            compute,
            `SELECT schemaname, relname AS table_name, n_live_tup, n_dead_tup,
                    CASE WHEN n_live_tup + n_dead_tup > 0 THEN ROUND((n_dead_tup::numeric / (n_live_tup + n_dead_tup)) * 100, 2) ELSE 0 END AS dead_tuple_pct
               FROM ${pgStatTables}
              ORDER BY dead_tuple_pct DESC, n_dead_tup DESC
              LIMIT 100`,
          ),
        ]);
        return auditResult(
          'getBloatEstimates',
          'Collected bloat risk estimates (DuckDB compute; absolute sizes unavailable).',
          { dbSummary: summary.rows[0] ?? {}, tables: tables.rows },
        );
      }),
  });
}

export const createGetReplicationHealthTool = catalogTool(
  'getReplicationHealth',
  'Inspect PostgreSQL replication status from pg_stat_replication.',
  async (compute) => `SELECT application_name, state, sync_state, write_lag, flush_lag, replay_lag
     FROM ${await qualifyTable(compute, 'pg_catalog', 'pg_stat_replication')}
    ORDER BY application_name`,
  'Collected replication health signals.',
);

export function assertAuditAggregateSql(sql: string): void {
  assertReadOnlySql(sql);
  const aggregate = validateAggregateOnly(sql);
  if (!aggregate.ok) throw new Error(aggregate.reason);
}
