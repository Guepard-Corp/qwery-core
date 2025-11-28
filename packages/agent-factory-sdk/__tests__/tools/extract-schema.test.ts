import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync, mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('extractSchema', () => {
  let testWorkspace: string;
  let dbPath: string;

  beforeEach(async () => {
    testWorkspace = join(
      tmpdir(),
      `test-workspace-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    dbPath = join(testWorkspace, 'test-conversation', 'database.db');

    // Create test database with a view
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
        (3, 'Bob Johnson', 35, 'Chicago')
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

  it('should extract schema from DuckDB view', async () => {
    const { extractSchema } = await import('../../src/tools/extract-schema');
    const schema = await extractSchema({
      dbPath,
    });

    expect(schema).toBeDefined();
    expect(schema.databaseName).toBe('google_sheet');
    expect(schema.schemaName).toBe('google_sheet');
    expect(schema.tables).toHaveLength(1);
    expect(schema.tables[0].tableName).toBe('my_sheet');
    expect(schema.tables[0].columns).toHaveLength(4);

    // Verify column structure
    const columns = schema.tables[0].columns;
    expect(
      columns.find((c: { columnName: string }) => c.columnName === 'id'),
    ).toBeDefined();
    expect(
      columns.find((c: { columnName: string }) => c.columnName === 'name'),
    ).toBeDefined();
    expect(
      columns.find((c: { columnName: string }) => c.columnName === 'age'),
    ).toBeDefined();
    expect(
      columns.find((c: { columnName: string }) => c.columnName === 'city'),
    ).toBeDefined();

    // Verify column types
    const idColumn = columns.find(
      (c: { columnName: string }) => c.columnName === 'id',
    );
    expect(idColumn?.columnType).toBeDefined();
  });

  it('should throw error when database does not exist', async () => {
    const { extractSchema } = await import('../../src/tools/extract-schema');
    await expect(
      extractSchema({
        dbPath: join(testWorkspace, 'non-existent', 'database.db'),
      }),
    ).rejects.toThrow();
  });

  it('should handle empty view gracefully', async () => {
    // Create a new database with an empty view
    const emptyDbPath = join(
      testWorkspace,
      'empty-conversation',
      'database.db',
    );
    mkdirSync(join(testWorkspace, 'empty-conversation'), { recursive: true });

    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(emptyDbPath);
    const conn = await instance.connect();

    try {
      await conn.run(`CREATE VIEW my_sheet AS SELECT 1 as id WHERE 1 = 0`);
    } finally {
      conn.closeSync();
      instance.closeSync();
    }

    const { extractSchema } = await import('../../src/tools/extract-schema');
    const schema = await extractSchema({
      dbPath: emptyDbPath,
    });

    expect(schema).toBeDefined();
    expect(schema.tables[0].columns).toHaveLength(1);

    // Cleanup
    try {
      unlinkSync(emptyDbPath);
      rmdirSync(join(testWorkspace, 'empty-conversation'));
    } catch {
      // Ignore cleanup errors
    }
  });
});
