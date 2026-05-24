import { describe, expect, test } from 'bun:test';
import { AGGREGATE_FUNCTIONS, validateAggregateOnly } from '../aggregate-validator';

/**
 * This test suite gates the privacy boundary (ADR #28). Anything that slips
 * past `validateAggregateOnly` would leak row-level data into the LLM via
 * runQuery. Be extra paranoid here.
 */

describe('validateAggregateOnly — accepts', () => {
  test('single COUNT(*)', () => {
    expect(validateAggregateOnly('SELECT COUNT(*) FROM t').ok).toBe(true);
  });
  test('COUNT(*) with WHERE clause', () => {
    expect(validateAggregateOnly("SELECT COUNT(*) FROM t WHERE country = 'FR'").ok).toBe(true);
  });
  test('multiple aggregates with aliases', () => {
    expect(validateAggregateOnly('SELECT COUNT(*) AS total, SUM(amount) AS rev, AVG(price) FROM t').ok).toBe(
      true,
    );
  });
  test('aggregates over expressions', () => {
    expect(validateAggregateOnly('SELECT SUM(quantity * unit_price) FROM t').ok).toBe(true);
  });
  test('uppercase / lowercase / mixed-case function names', () => {
    expect(validateAggregateOnly('select count(*) from t').ok).toBe(true);
    expect(validateAggregateOnly('SELECT Median(x) FROM t').ok).toBe(true);
  });
  test('trailing semicolon is tolerated', () => {
    expect(validateAggregateOnly('SELECT COUNT(*) FROM t;').ok).toBe(true);
  });
  test('every aggregate function in the allow-list parses', () => {
    for (const fn of AGGREGATE_FUNCTIONS) {
      const sql = `SELECT ${fn}(x) FROM t`;
      const result = validateAggregateOnly(sql);
      expect(result.ok).toBe(true);
    }
  });
});

describe('validateAggregateOnly — rejects (privacy critical)', () => {
  test('SELECT * leaks all columns', () => {
    const r = validateAggregateOnly('SELECT * FROM t');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('SELECT *');
  });
  test('bare column reference leaks values', () => {
    const r = validateAggregateOnly('SELECT name FROM t');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('aggregate');
  });
  test('mix of aggregate + bare column is rejected', () => {
    const r = validateAggregateOnly('SELECT name, COUNT(*) FROM t');
    expect(r.ok).toBe(false);
  });
  test('GROUP BY produces multi-row + can leak group keys', () => {
    const r = validateAggregateOnly('SELECT country, COUNT(*) FROM t GROUP BY country');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('GROUP BY');
  });
  test('ORDER BY is rejected', () => {
    const r = validateAggregateOnly('SELECT COUNT(*) FROM t ORDER BY 1');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('ORDER BY');
  });
  test('LIMIT is rejected', () => {
    const r = validateAggregateOnly('SELECT COUNT(*) FROM t LIMIT 10');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('LIMIT');
  });
  test('unknown function names are rejected', () => {
    const r = validateAggregateOnly('SELECT foo(x) FROM t');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('aggregate');
  });
  test('SELECT followed by no FROM is rejected', () => {
    const r = validateAggregateOnly('UPDATE t SET x = 1');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('SELECT');
  });
  test('SELECT with subquery returning bare column is rejected', () => {
    // The subquery counts as one expression; without an aggregate wrapper, reject.
    const r = validateAggregateOnly('SELECT (SELECT name FROM users LIMIT 1) FROM t');
    expect(r.ok).toBe(false);
  });
  test('does not get fooled by aggregate-looking aliases', () => {
    // `count` looks like an aggregate but is being used as an alias on a bare column.
    const r = validateAggregateOnly('SELECT name AS count FROM t');
    expect(r.ok).toBe(false);
  });
});

describe('validateAggregateOnly — split projections', () => {
  test('correctly handles commas inside function arguments', () => {
    expect(validateAggregateOnly('SELECT CONCAT_WS(SUM(x), AVG(y)) FROM t').ok).toBe(false); // outer is CONCAT_WS, not an aggregate function name
  });
  test('handles aliased aggregates with double-quoted names', () => {
    expect(validateAggregateOnly('SELECT COUNT(*) AS "Total Count" FROM t').ok).toBe(true);
  });
});
