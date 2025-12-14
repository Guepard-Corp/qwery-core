import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync, mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('extractSchema', () => {
  let testWorkspace: string;
  const conversationId = 'test-conversation';

  beforeEach(async () => {
    testWorkspace = join(
      tmpdir(),
      `test-workspace-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    const dbPath = join(testWorkspace, conversationId, 'database.db');

    // Create test database with a view
    mkdirSync(join(testWorkspace, conversationId), { recursive: true });

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

  afterEach(async () => {
    // Clean up test database files
    try {
      const dbPath = join(testWorkspace, conversationId, 'database.db');
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
      try {
        rmdirSync(join(testWorkspace, conversationId));
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
    const dbPath = join(testWorkspace, conversationId, 'database.db');
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();
    try {
      const schema = await extractSchema({
        connection: conn,
      });

      expect(schema).toBeDefined();
      expect(schema.databaseName).toBe('google_sheet');
      expect(schema.schemaName).toBe('google_sheet');
      // Filter to only user-created views (exclude system views)
      const userViews = schema.tables.filter(
        (t) =>
          t.tableName === 'my_sheet' ||
          t.tableName.startsWith('sheet_') ||
          t.tableName.startsWith('my_'),
      );
      expect(userViews.length).toBeGreaterThanOrEqual(1);
      const mySheet = schema.tables.find((t) => t.tableName === 'my_sheet');
      expect(mySheet).toBeDefined();
      expect(mySheet!.columns).toHaveLength(4);

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
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  });

  it('should create database and return empty schema when database does not exist', async () => {
    const { extractSchema } = await import('../../src/tools/extract-schema');
    const nonExistentId = 'non-existent';
    const dbPath = join(testWorkspace, nonExistentId, 'database.db');
    mkdirSync(join(testWorkspace, nonExistentId), { recursive: true });
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();
    try {
      const result = await extractSchema({
        connection: conn,
      });
      expect(result).toBeDefined();
      expect(result.tables).toEqual([]);
    } finally {
      conn.closeSync();
      instance.closeSync();
      // Cleanup
      try {
        unlinkSync(dbPath);
        rmdirSync(join(testWorkspace, nonExistentId));
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should handle empty view gracefully', async () => {
    // Create a new database with an empty view
    const emptyConversationId = 'empty-conversation';
    const emptyDbPath = join(testWorkspace, emptyConversationId, 'database.db');
    mkdirSync(join(testWorkspace, emptyConversationId), { recursive: true });

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
    const { DuckDBInstance: DuckDBInstance2 } = await import(
      '@duckdb/node-api'
    );
    const extractInstance = await DuckDBInstance2.create(emptyDbPath);
    const extractConn = await extractInstance.connect();
    try {
      const schema = await extractSchema({
        connection: extractConn,
      });

      expect(schema).toBeDefined();
      expect(schema.tables[0].columns).toHaveLength(1);
    } finally {
      extractConn.closeSync();
      extractInstance.closeSync();
    }

    // Cleanup
    try {
      unlinkSync(emptyDbPath);
      rmdirSync(join(testWorkspace, emptyConversationId));
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should extract schema from specific view when viewName is provided', async () => {
    const { extractSchema } = await import('../../src/tools/extract-schema');
    const dbPath = join(testWorkspace, conversationId, 'database.db');
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();
    try {
      const schema = await extractSchema({
        connection: conn,
        viewName: 'my_sheet',
      });

      expect(schema).toBeDefined();
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].tableName).toBe('my_sheet');
      expect(schema.tables[0].columns).toHaveLength(4);
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  });

  it('should extract schemas from all views when viewName is not provided', async () => {
    // Add another view to the database
    const dbPath = join(testWorkspace, conversationId, 'database.db');
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      await conn.run(`
        CREATE TABLE test_data2 (
          id INTEGER,
          value VARCHAR
        )
      `);
      await conn.run(`
        INSERT INTO test_data2 VALUES
        (1, 'Value 1'),
        (2, 'Value 2')
      `);
      await conn.run(`CREATE VIEW my_sheet2 AS SELECT * FROM test_data2`);
    } finally {
      conn.closeSync();
      instance.closeSync();
    }

    const { extractSchema } = await import('../../src/tools/extract-schema');
    const extractDbPath = join(testWorkspace, conversationId, 'database.db');
    const { DuckDBInstance: DuckDBInstance3 } = await import(
      '@duckdb/node-api'
    );
    const extractInstance2 = await DuckDBInstance3.create(extractDbPath);
    const extractConn2 = await extractInstance2.connect();
    try {
      const schema = await extractSchema({
        connection: extractConn2,
      });

      expect(schema).toBeDefined();
      expect(schema.tables.length).toBeGreaterThanOrEqual(2);
      const viewNames = schema.tables.map((t) => t.tableName);
      expect(viewNames).toContain('my_sheet');
      expect(viewNames).toContain('my_sheet2');
    } finally {
      extractConn2.closeSync();
      extractInstance2.closeSync();
    }
  });
});
