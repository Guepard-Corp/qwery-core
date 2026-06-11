import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { collectFindings, type Finding, PATHS } from './privacy-check';

const root = resolve(import.meta.dir, '..');
const realSource = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

/** A loader that serves the real tree except for the paths overridden here. */
function loaderWith(overrides: Partial<Record<string, string>>): (rel: string) => string {
  return (rel) => overrides[rel] ?? realSource(rel);
}

/** Tamper one real source by string-replacement, leaving every other file intact. */
function tamper(rel: string, replace: (src: string) => string): (r: string) => string {
  return loaderWith({ [rel]: replace(realSource(rel)) });
}

const rules = (findings: Finding[]) => findings.map((f) => f.rule);

describe('privacy-check static invariants', () => {
  // Happy path: the real tree must satisfy every invariant (regression guard —
  // this is exactly what pre-push/CI asserts).
  test('the committed tree has zero privacy findings', () => {
    expect(collectFindings(realSource)).toEqual([]);
  });

  describe('audit toolset (db-audit.ts)', () => {
    test('flags an audit tool reading a non-catalog (user) relation', () => {
      const findings = collectFindings(
        tamper(PATHS.dbAudit, (src) =>
          src.replace(
            "qualifyTable(compute, 'pg_catalog', 'pg_settings')",
            "qualifyTable(compute, 'public', 'orders')",
          ),
        ),
      );
      expect(rules(findings)).toContain('audit.catalog-only');
    });

    // Edge: a real catalog that is simply not on the allowlist is still flagged —
    // widening the upstream surface must be a deliberate allowlist edit.
    test('flags a catalog relation that is not on the allowlist', () => {
      const findings = collectFindings(
        tamper(PATHS.dbAudit, (src) =>
          src.replace(
            "qualifyTable(compute, 'pg_catalog', 'pg_settings')",
            "qualifyTable(compute, 'pg_catalog', 'pg_class')",
          ),
        ),
      );
      expect(rules(findings)).toContain('audit.catalog-only');
    });

    test('flags raw native SQL execution that is not an allowlisted constant', () => {
      const findings = collectFindings(
        tamper(PATHS.dbAudit, (src) =>
          src.replace(
            'runSqlOnSourcePostgres(url, BLOAT_SUMMARY_SQL_PG)',
            'runSqlOnSourcePostgres(url, userSql)',
          ),
        ),
      );
      expect(rules(findings)).toContain('audit.native-sql-allowlist');
    });

    test('flags a second compute.runSql call that escapes the safeRun guard', () => {
      const findings = collectFindings(
        tamper(
          PATHS.dbAudit,
          (src) => `${src}\nfunction _leak(): unknown { return compute.runSql('SELECT * FROM orders'); }\n`,
        ),
      );
      expect(rules(findings)).toContain('audit.compute-guarded');
    });

    test('flags SELECT * in a native bloat constant', () => {
      const findings = collectFindings(
        tamper(PATHS.dbAudit, (src) =>
          src.replace('SELECT pg_database_size(current_database()) AS database_bytes', 'SELECT *'),
        ),
      );
      expect(rules(findings)).toContain('audit.bloat-constants-catalog-only');
    });
  });

  describe('native plan path (pg-native.ts)', () => {
    test('flags an EXPLAIN prefix that is not actually EXPLAIN', () => {
      const findings = collectFindings(
        tamper(PATHS.pgNative, (src) =>
          src.replace("'EXPLAIN (FORMAT JSON, BUFFERS)'", "'SELECT 1 -- not a plan'"),
        ),
      );
      expect(rules(findings)).toContain('pg-native.explain-plan-only');
    });

    test('flags a missing read-only session guard on the raw native executor', () => {
      const findings = collectFindings(
        tamper(PATHS.pgNative, (src) =>
          src.replace(
            "await client.query('SET default_transaction_read_only = on');\n    const res = await client.query(sql);",
            'const res = await client.query(sql);',
          ),
        ),
      );
      expect(rules(findings)).toContain('pg-native.read-only-session');
    });
  });

  // The refactor must not regress the original tools.ts / present guards.
  test('still flags runQuery dropping the aggregate validator', () => {
    const findings = collectFindings(
      tamper(PATHS.tools, (src) => src.replaceAll('validateAggregateOnly(sql)', 'sql')),
    );
    expect(rules(findings)).toContain('runQuery.aggregate-validator');
  });
});
