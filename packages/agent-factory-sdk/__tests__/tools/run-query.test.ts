import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync, mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('runQuery', () => {
  let testWorkspace: string;
  let dbPath: string;

  beforeEach(async () => {
    testWorkspace = join(
      tmpdir(),
      `test-workspace-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    dbPath = join(testWorkspace, 'test-conversation', 'database.db');

    mkdirSync(join(testWorkspace, 'test-conversation'), { recursive: true });

    // Create DuckDB instance and view with test data
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      // Create a test view with sample data
      await conn.run(`
        CREATE TABLE test_data (
          id INTEGER,
          name VARCHAR,
          age INTEGER,
          city VARCHAR
        )
      `);

      await conn.run(`
        INSERT INTO test_data VALUES
        (1, 'John Doe', 30, 'New York'),
        (2, 'Jane Smith', 25, 'San Francisco'),
        (3, 'Bob Johnson', 35, 'Chicago'),
        (4, 'Alice Williams', 28, 'Boston')
      `);

      await conn.run(`CREATE VIEW my_sheet AS SELECT * FROM test_data`);
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  });

  afterEach(() => {
    // Clean up test database files
    try {
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
      try {
        rmdirSync(join(testWorkspace, 'test-conversation'));
        rmdirSync(testWorkspace);
      } catch {
        // Ignore errors
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should execute SELECT query and return results', async () => {
    const { runQuery } = await import('../../src/tools/run-query');
    const result = await runQuery({
      dbPath,
      query: 'SELECT * FROM my_sheet LIMIT 2',
    });

    expect(result).toBeDefined();
    expect(result.columns).toContain('id');
    expect(result.columns).toContain('name');
    expect(result.columns).toContain('age');
    expect(result.columns).toContain('city');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toHaveProperty('id');
    expect(result.rows[0]).toHaveProperty('name');
  });

  it('should execute filtered query', async () => {
    const { runQuery } = await import('../../src/tools/run-query');
    const result = await runQuery({
      dbPath,
      query: 'SELECT * FROM my_sheet WHERE age > 30',
    });

    expect(result).toBeDefined();
    expect(result.rows.length).toBeGreaterThan(0);
    result.rows.forEach((row) => {
      expect(Number(row.age)).toBeGreaterThan(30);
    });
  });

  it('should execute aggregation query', async () => {
    const { runQuery } = await import('../../src/tools/run-query');
    const result = await runQuery({
      dbPath,
      query: 'SELECT COUNT(*) as total FROM my_sheet',
    });

    expect(result).toBeDefined();
    expect(result.columns).toContain('total');
    expect(result.rows).toHaveLength(1);
    expect(Number(result.rows[0].total)).toBe(4);
  });

  it('should return empty results for query with no matches', async () => {
    const { runQuery } = await import('../../src/tools/run-query');
    const result = await runQuery({
      dbPath,
      query: 'SELECT * FROM my_sheet WHERE age > 100',
    });

    expect(result).toBeDefined();
    expect(result.rows).toHaveLength(0);
    expect(result.columns.length).toBeGreaterThan(0);
  });

  it('should handle SELECT with specific columns', async () => {
    const { runQuery } = await import('../../src/tools/run-query');
    const result = await runQuery({
      dbPath,
      query: 'SELECT name, city FROM my_sheet',
    });

    expect(result).toBeDefined();
    expect(result.columns).toHaveLength(2);
    expect(result.columns).toContain('name');
    expect(result.columns).toContain('city');
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0]).toHaveProperty('name');
    expect(result.rows[0]).toHaveProperty('city');
    expect(result.rows[0]).not.toHaveProperty('id');
  });

  it('should throw error when database does not exist', async () => {
    const { runQuery } = await import('../../src/tools/run-query');
    await expect(
      runQuery({
        dbPath: join(testWorkspace, 'non-existent', 'database.db'),
        query: 'SELECT * FROM my_sheet',
      }),
    ).rejects.toThrow();
  });

  it('should throw error for invalid SQL query', async () => {
    const { runQuery } = await import('../../src/tools/run-query');
    await expect(
      runQuery({
        dbPath,
        query: 'INVALID SQL QUERY',
      }),
    ).rejects.toThrow();
  });

  it('should convert BigInt values to numbers/strings for JSON serialization', async () => {
    // Create a table with BIGINT values
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      await conn.run(`
        CREATE TABLE bigint_test (
          id BIGINT,
          safe_number BIGINT,
          large_number BIGINT
        )
      `);

      await conn.run(`
        INSERT INTO bigint_test VALUES
        (1, 9007199254740991, 9223372036854775807),
        (2, 1234567890, 1234567890123456789)
      `);
    } finally {
      conn.closeSync();
      instance.closeSync();
    }

    const { runQuery } = await import('../../src/tools/run-query');
    const result = await runQuery({
      dbPath,
      query: 'SELECT * FROM bigint_test',
    });

    expect(result).toBeDefined();
    expect(result.rows.length).toBe(2);

    // Verify BigInt values are converted (not BigInt type)
    expect(typeof result.rows[0].id).not.toBe('bigint');
    expect(typeof result.rows[0].safe_number).not.toBe('bigint');
    expect(typeof result.rows[0].large_number).not.toBe('bigint');

    // Values within safe integer range should be numbers
    expect(typeof result.rows[0].id).toBe('number');
    expect(typeof result.rows[0].safe_number).toBe('number');

    // Values outside safe integer range should be strings
    expect(typeof result.rows[0].large_number).toBe('string');

    // Verify the values are correct
    expect(result.rows[0].id).toBe(1);
    expect(result.rows[0].safe_number).toBe(9007199254740991);
    expect(result.rows[0].large_number).toBe('9223372036854775807');

    // Verify JSON serialization works without errors
    const jsonString = JSON.stringify(result);
    expect(jsonString).toBeTruthy();
    const parsed = JSON.parse(jsonString);
    expect(parsed.rows[0].id).toBe(1);
    expect(parsed.rows[0].safe_number).toBe(9007199254740991);
    expect(parsed.rows[0].large_number).toBe('9223372036854775807');
  });
});
