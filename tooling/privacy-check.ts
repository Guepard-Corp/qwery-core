/**
 * Privacy invariant harness (ADR #28, #31).
 *
 * Asserts that the LLM never receives row-level values from the test dataset.
 * Strategy:
 *   1. Read all values from `data/sales.csv` — this is our "must not leak" set.
 *   2. Run a series of representative agent prompts.
 *   3. Capture every payload the AI SDK would send upstream (system prompt,
 *      messages, tool results) via a recording wrapper around the model.
 *   4. Assert: for every value in the dataset, NO substring match in any payload.
 *
 * NOTE — MVP scaffold. The full implementation requires wiring a recording
 * provider into the agent loop. Today it shells the privacy check via static
 * inspection: parses tools.ts to verify that `runQuery` validates aggregate-only
 * and that `present` only returns `{ ok, rowCount }` to the LLM. The behavioural
 * test follows post-restructure when adapter ports are isolatable.
 *
 * NOTE — performance. Every check here is pure static source inspection run at
 * pre-push/CI (`check:privacy`). This module is never imported by the agent
 * runtime, so it adds ZERO overhead to the db-performance-audit /
 * slow-query-optimizer agents' tool execution. The audit toolset is covered by
 * structural guards (Section 5) rather than runtime row scanning precisely to
 * keep the agents' audit/optimization paths untouched.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Finding {
  rule: string;
  message: string;
}

/** Source files the static checks inspect, relative to the repo root. */
export const PATHS = {
  tools: 'packages/agent-factory-sdk/src/tools.ts',
  computeDuckdb: 'packages/adapters/compute-duckdb/src/index.ts',
  telemetryActions: 'apps/cli/src/infra/telemetry-actions.ts',
  dbAudit: 'packages/agent-factory-sdk/src/tools/db-audit.ts',
  pgNative: 'packages/agent-factory-sdk/src/tools/pg-native.ts',
} as const;

/**
 * System catalogs / statistics views the audit toolset is allowed to read. The
 * audit tools only ever surface metadata from these to the LLM — never a user
 * data table. Adding a relation here is a deliberate, reviewable widening of the
 * upstream surface.
 */
const AUDIT_CATALOG_RELATIONS = new Set([
  'pg_settings',
  'pg_stat_statements',
  'pg_stat_user_indexes',
  'pg_stat_user_tables',
  'pg_locks',
  'pg_stat_activity',
  'pg_stat_replication',
]);

/**
 * The only constants the audit toolset may hand to the raw native executor
 * (`runSqlOnSourcePostgres`). Both read catalog/size functions only — never
 * user/LLM-supplied SQL, which could stream row data back.
 */
const AUDIT_NATIVE_SQL_CONSTANTS = new Set(['BLOAT_SUMMARY_SQL_PG', 'BLOAT_TABLES_SQL_PG']);

/**
 * Collect privacy-invariant violations from the given sources. `load` resolves a
 * repo-relative path to its source text — injectable so the checks can be unit
 * tested against tampered fixtures without touching the real tree.
 */
export function collectFindings(load: (rel: string) => string): Finding[] {
  const findings: Finding[] = [];

  // --- Static check 1: runQuery uses the aggregate validator
  const tools = load(PATHS.tools);
  if (!/validateAggregateOnly\s*\(\s*sql\s*\)/.test(tools)) {
    findings.push({
      rule: 'runQuery.aggregate-validator',
      message: '`runQuery` must call validateAggregateOnly(sql) before executing.',
    });
  }
  if (!/result\.rowCount\s*!==\s*1/.test(tools)) {
    findings.push({
      rule: 'runQuery.single-row',
      message: '`runQuery` must reject results with rowCount !== 1.',
    });
  }

  // --- Static check 2: present returns only { ok, rowCount } to the LLM, never rows.
  const presentBlock = tools.match(/present:\s*tool\(\{[\s\S]*?execute:[\s\S]*?\}\),/);
  if (!presentBlock) {
    findings.push({
      rule: 'present.shape',
      message: '`present` tool block could not be located in packages/agent-factory-sdk/src/tools.ts.',
    });
  } else {
    const text = presentBlock[0];
    const llmReturn = text.match(/llm:\s*\{([^}]*)\}/);
    if (!llmReturn) {
      findings.push({
        rule: 'present.llm-shape',
        message: '`present` must declare its llm-facing return shape inline.',
      });
    } else {
      const shape = llmReturn[1] ?? '';
      if (/rows/.test(shape) || /row:\s/.test(shape) || /result:\s/.test(shape)) {
        findings.push({
          rule: 'present.no-row-leak',
          message:
            '`present` LLM return shape must not include rows/row/result. Found suspicious key in: ' +
            shape.trim(),
        });
      }
    }
  }

  // --- Static check 3: describeQuery uses PREPARE, not actual execution
  const adapter = load(PATHS.computeDuckdb);
  if (!/describeSql[\s\S]*?prepare\(/.test(adapter)) {
    findings.push({
      rule: 'describeQuery.prepare-only',
      message: 'describeSql must use prepare() (no data exposed). Found something else.',
    });
  }

  // --- Static check 4: telemetry redaction layer reads no personal-data fields.
  // All TUI telemetry routes through `telemetry-actions.ts`. If that module never
  // reads the content-bearing fields of a tool result/input, it cannot forward
  // them — so analytics/traces stay free of statements, rows, locations, shell
  // input, rendered output and error wording. Word boundaries keep safe lookalikes
  // (rowCount, taskStatus) from tripping the check.
  const telemetryActions = load(PATHS.telemetryActions);
  const FORBIDDEN_FIELD_ACCESS: Array<{ pattern: RegExp; field: string }> = [
    { pattern: /\.sql\b/, field: 'sql' },
    { pattern: /\.rows\b/, field: 'rows' },
    { pattern: /\.row\b/, field: 'row' },
    { pattern: /\.stdout\b/, field: 'stdout' },
    { pattern: /\.stderr\b/, field: 'stderr' },
    { pattern: /\.command\b/, field: 'command' },
    { pattern: /\.diff\b/, field: 'diff' },
    { pattern: /\.rendered\b/, field: 'rendered' },
    { pattern: /\.preview\b/, field: 'preview' },
    { pattern: /\.query\b/, field: 'query' },
    { pattern: /\.task\b/, field: 'task' },
    { pattern: /\.message\b/, field: 'message' },
    { pattern: /\.path\b/, field: 'path' },
    { pattern: /\.text\b/, field: 'text' },
  ];
  for (const { pattern, field } of FORBIDDEN_FIELD_ACCESS) {
    if (pattern.test(telemetryActions)) {
      findings.push({
        rule: 'telemetry.no-pii-field',
        message: `telemetry-actions.ts must not read \`.${field}\` (personal data must never reach telemetry).`,
      });
    }
  }

  // --- Static check 5: audit toolset surfaces only catalog metadata to the LLM.
  // The db-performance-audit / slow-query-optimizer agents DO return tool results
  // upstream (plan nodes, catalog stats) — that is their purpose. So the invariant
  // is not "nothing flows" but "only system-catalog metadata flows, never a user
  // data table's rows". These guards pin that structurally; see ADR #28.
  collectAuditFindings(load, findings);

  return findings;
}

function collectAuditFindings(load: (rel: string) => string, findings: Finding[]): void {
  const dbAudit = load(PATHS.dbAudit);

  // 5a. Every DuckDB read is funnelled through the single guarded `safeRun`,
  // which validates read-only SQL before touching `compute.runSql`. More than one
  // `compute.runSql(` call site means a read escaped the guard.
  const computeRunSqlCalls = (dbAudit.match(/compute\.runSql\(/g) ?? []).length;
  if (computeRunSqlCalls !== 1) {
    findings.push({
      rule: 'audit.compute-guarded',
      message: `db-audit.ts must funnel every DuckDB read through safeRun (expected exactly 1 compute.runSql call, found ${computeRunSqlCalls}).`,
    });
  }
  if (
    !/async function safeRun\([\s\S]*?assertReadOnlySql\(sql\)[\s\S]*?compute\.runSql\(sql\)/.test(dbAudit)
  ) {
    findings.push({
      rule: 'audit.compute-guarded',
      message: 'safeRun must call assertReadOnlySql(sql) before compute.runSql(sql).',
    });
  }

  // 5b. The read-only validator must restrict statements to a read-only allowlist
  // and reject write-capable keywords.
  if (!/\^\(SELECT\|WITH\|EXPLAIN\|SHOW\)/.test(dbAudit) || !/WRITE_KEYWORDS\.test\(/.test(dbAudit)) {
    findings.push({
      rule: 'audit.read-only-validator',
      message:
        'assertReadOnlySql must allow only SELECT/WITH/EXPLAIN/SHOW and reject WRITE_KEYWORDS. The guard appears weakened or removed.',
    });
  }

  // 5c. Every relation the catalog tools read is named via qualifyTable(compute,
  // schema, relation). Each relation must be a system catalog / stats view — never
  // a user data table.
  const qualifyTableRe = /qualifyTable\(\s*compute\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;
  for (const match of dbAudit.matchAll(qualifyTableRe)) {
    const relation = match[2] ?? '';
    if (!AUDIT_CATALOG_RELATIONS.has(relation)) {
      findings.push({
        rule: 'audit.catalog-only',
        message: `Audit tools may only read system catalogs; qualifyTable references non-catalog relation "${relation}".`,
      });
    }
  }

  // 5d. The raw native executor may only run the two allowlisted catalog
  // constants — never a variable or interpolated string (which could carry
  // user/LLM SQL whose rows would flow upstream). EXPLAIN of user queries goes
  // through explainOnSourcePostgres instead (plan only — see Section 6).
  const nativeRunRe = /runSqlOnSourcePostgres\(\s*[^,]+,\s*([^)]+?)\s*\)/g;
  for (const match of dbAudit.matchAll(nativeRunRe)) {
    const arg = (match[1] ?? '').trim();
    if (!AUDIT_NATIVE_SQL_CONSTANTS.has(arg)) {
      findings.push({
        rule: 'audit.native-sql-allowlist',
        message: `runSqlOnSourcePostgres must only run an allowlisted catalog constant (${[...AUDIT_NATIVE_SQL_CONSTANTS].join(', ')}); found "${arg}".`,
      });
    }
  }

  // 5e. The native bloat constants must read only catalog relations and never
  // `SELECT *` (which could widen to user columns as the schema evolves).
  for (const constName of AUDIT_NATIVE_SQL_CONSTANTS) {
    const constRe = new RegExp(`const ${constName} = \`([\\s\\S]*?)\``);
    const body = dbAudit.match(constRe)?.[1];
    if (body === undefined) {
      findings.push({
        rule: 'audit.native-sql-allowlist',
        message: `Allowlisted native constant ${constName} was not found in db-audit.ts.`,
      });
      continue;
    }
    if (/select\s+\*/i.test(body)) {
      findings.push({
        rule: 'audit.bloat-constants-catalog-only',
        message: `${constName} must not use SELECT * (only explicit catalog columns may reach the LLM).`,
      });
    }
    for (const ref of body.matchAll(/\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)) {
      const relation = ref[1] ?? '';
      if (!AUDIT_CATALOG_RELATIONS.has(relation)) {
        findings.push({
          rule: 'audit.bloat-constants-catalog-only',
          message: `${constName} reads non-catalog relation "${relation}".`,
        });
      }
    }
  }

  // --- Static check 6: the native plan path returns plans, never row data.
  const pgNative = load(PATHS.pgNative);

  // 6a. explainOnSourcePostgres must prefix every executed statement with EXPLAIN
  // (so Postgres returns plan nodes, not the query's result set) and surface the
  // result only via planFromExplainRow, which reads the single "QUERY PLAN" column.
  const explainBlock = pgNative.match(/export async function explainOnSourcePostgres\([\s\S]*?\n}/);
  if (!explainBlock) {
    findings.push({
      rule: 'pg-native.explain-plan-only',
      message: 'explainOnSourcePostgres could not be located in pg-native.ts.',
    });
  } else {
    const block = explainBlock[0];
    // The executed statement must be exactly `${prefix} ${sql}`, and every literal
    // the `prefix` can take must begin with EXPLAIN — so Postgres returns a plan,
    // never the query's result rows.
    const prefixExpr = block.match(/const prefix\s*=\s*([^;]+);/)?.[1] ?? '';
    const prefixLiterals = [...prefixExpr.matchAll(/'([^']*)'/g)].map((m) => m[1] ?? '');
    const everyPrefixExplains =
      prefixLiterals.length > 0 && prefixLiterals.every((literal) => /^EXPLAIN\b/.test(literal));
    if (!/client\.query\(`\$\{prefix\}\s+\$\{sql\}`\)/.test(block) || !everyPrefixExplains) {
      findings.push({
        rule: 'pg-native.explain-plan-only',
        message:
          'explainOnSourcePostgres must execute only the prefixed (prefix + sql) form, where prefix begins with EXPLAIN.',
      });
    }
    if (!/planFromExplainRow\(/.test(block)) {
      findings.push({
        rule: 'pg-native.explain-plan-only',
        message: 'explainOnSourcePostgres must return plans via planFromExplainRow (plan column only).',
      });
    }
  }
  if (!/const cell = rows\[0\]\?\.\['QUERY PLAN'\]/.test(pgNative)) {
    findings.push({
      rule: 'pg-native.explain-plan-only',
      message: 'planFromExplainRow must read only the "QUERY PLAN" column, never arbitrary row data.',
    });
  }

  // 6b. Native exec helpers force a read-only session as defence in depth, so even
  // a mistaken statement cannot mutate the source database.
  for (const fn of ['explainOnSourcePostgres', 'runSqlOnSourcePostgres']) {
    const fnBlock = pgNative.match(new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n}`));
    if (fnBlock && !/SET default_transaction_read_only = on/.test(fnBlock[0])) {
      findings.push({
        rule: 'pg-native.read-only-session',
        message: `${fn} must SET default_transaction_read_only = on before querying.`,
      });
    }
  }
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, '..');
  const findings = collectFindings((rel) => readFileSync(resolve(root, rel), 'utf-8'));

  if (findings.length === 0) {
    console.log('✓ Privacy invariants hold.');
    process.exit(0);
  }

  console.error('✗ Privacy invariants violated:');
  for (const f of findings) console.error(`  [${f.rule}] ${f.message}`);
  process.exit(1);
}
