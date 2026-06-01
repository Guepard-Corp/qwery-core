import { describe, expect, test } from 'bun:test';
import { createDuckDBCompute, DEFAULT_QUERY_TIMEOUT_MS } from './index';

describe('DuckDBCompute', () => {
  test('runSql returns columns, rows and rowCount', async () => {
    const compute = createDuckDBCompute();
    const result = await compute.runSql('SELECT 1 AS a, 2 AS b');
    expect(result.columns).toEqual(['a', 'b']);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]).toEqual({ a: 1, b: 2 });
  });

  test('describeSql returns the output schema without executing', async () => {
    const compute = createDuckDBCompute();
    const schema = await compute.describeSql('SELECT 1 AS a, CAST(2 AS VARCHAR) AS b');
    expect(schema.columns.map((c) => c.name)).toEqual(['a', 'b']);
  });

  test('interrupts and rejects a query that overruns the timeout', async () => {
    const compute = createDuckDBCompute({ timeoutMs: 100 });
    // range(50e9) forces a long full scan that far exceeds 100ms; interrupt cancels it.
    await expect(compute.runSql('SELECT sum(i) FROM range(50000000000) t(i)')).rejects.toThrow(
      /exceeded 100ms timeout/,
    );
  });

  test('a fast query still succeeds under a short timeout', async () => {
    const compute = createDuckDBCompute({ timeoutMs: 5_000 });
    const result = await compute.runSql('SELECT 42 AS answer');
    expect(result.rows[0]).toEqual({ answer: 42 });
  });

  test('timeoutMs: 0 disables the timeout', async () => {
    const compute = createDuckDBCompute({ timeoutMs: 0 });
    const result = await compute.runSql('SELECT 1 AS a');
    expect(result.rowCount).toBe(1);
  });

  test('exposes a finite default timeout', () => {
    expect(DEFAULT_QUERY_TIMEOUT_MS).toBeGreaterThan(0);
    expect(Number.isFinite(DEFAULT_QUERY_TIMEOUT_MS)).toBe(true);
  });
});
