import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync, mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('testConnection', () => {
  let testWorkspace: string;
  let dbPath: string;

  beforeEach(async () => {
    testWorkspace = join(
      tmpdir(),
      `test-workspace-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    dbPath = join(testWorkspace, 'test-conversation', 'database.db');

    mkdirSync(join(testWorkspace, 'test-conversation'), { recursive: true });

    // Create DuckDB instance with test data
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      // Create a test table
      await conn.run(`
        CREATE TABLE test_data (
          id INTEGER,
          name VARCHAR
        )
      `);

      await conn.run(`
        INSERT INTO test_data VALUES
        (1, 'Test'),
        (2, 'Data')
      `);
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

  it('should return true for valid database connection', async () => {
    const { testConnection } = await import('../../src/tools/test-connection');
    const result = await testConnection({
      dbPath,
    });

    expect(result).toBe(true);
  });

  it('should create database if directory exists and return true', async () => {
    const { testConnection } = await import('../../src/tools/test-connection');
    const nonExistentPath = join(testWorkspace, 'non-existent', 'database.db');
    // Create the directory first
    mkdirSync(join(testWorkspace, 'non-existent'), { recursive: true });

    const result = await testConnection({
      dbPath: nonExistentPath,
    });

    expect(result).toBe(true);
    expect(existsSync(nonExistentPath)).toBe(true);

    // Cleanup
    try {
      unlinkSync(nonExistentPath);
      rmdirSync(join(testWorkspace, 'non-existent'));
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return true and allow querying the database', async () => {
    const { testConnection } = await import('../../src/tools/test-connection');
    const result = await testConnection({
      dbPath,
    });

    expect(result).toBe(true);

    // Verify we can still query the database after the test
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      const resultReader = await conn.runAndReadAll('SELECT * FROM test_data');
      await resultReader.readAll();
      const rows = resultReader.getRowObjectsJS();
      expect(rows.length).toBe(2);
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  });

  it('should handle invalid database path gracefully', async () => {
    const { testConnection } = await import('../../src/tools/test-connection');
    const invalidPath = '/invalid/path/to/database.db';

    const result = await testConnection({
      dbPath: invalidPath,
    });

    expect(result).toBe(false);
  });

  it('should create database if it does not exist and return true', async () => {
    const { testConnection } = await import('../../src/tools/test-connection');
    const newDbPath = join(testWorkspace, 'new-database', 'database.db');
    mkdirSync(join(testWorkspace, 'new-database'), { recursive: true });

    const result = await testConnection({
      dbPath: newDbPath,
    });

    expect(result).toBe(true);
    expect(existsSync(newDbPath)).toBe(true);

    // Cleanup
    try {
      unlinkSync(newDbPath);
      rmdirSync(join(testWorkspace, 'new-database'));
    } catch {
      // Ignore cleanup errors
    }
  });
});
