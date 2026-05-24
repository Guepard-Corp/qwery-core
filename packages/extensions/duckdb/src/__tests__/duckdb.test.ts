import { describe, expect, test } from 'bun:test';
import { buildAttachSql, catalogNameFor, driverFactory } from '../driver';

describe('catalogNameFor', () => {
  test('derives a safe identifier from the slug', () => {
    expect(catalogNameFor('sales-2026', 'id')).toBe('duckdb_sales_2026');
  });

  test('falls back to id then a default, sanitizing non-word chars', () => {
    expect(catalogNameFor(undefined, 'AbC.9')).toBe('duckdb_abc_9');
    expect(catalogNameFor()).toBe('duckdb_db');
  });

  test('caps the length at 60 chars', () => {
    expect(catalogNameFor('x'.repeat(100)).length).toBe(60);
  });
});

describe('buildAttachSql', () => {
  test('attaches a file READ_ONLY with the path escaped', () => {
    expect(buildAttachSql("a'b.duckdb", 'duckdb_x')).toBe("ATTACH 'a''b.duckdb' AS duckdb_x (READ_ONLY);");
  });

  test(':memory: is attached writable (read-only memory makes no sense)', () => {
    expect(buildAttachSql(':memory:', 'duckdb_x')).toBe("ATTACH ':memory:' AS duckdb_x;");
  });
});

interface FakeConn {
  ranSql: string[];
  rows: Array<Record<string, unknown>>;
  run(sql: string): Promise<void>;
  runAndReadAll(sql: string): Promise<{
    readAll(): Promise<void>;
    getRowObjectsJS(): Array<Record<string, unknown>>;
    columnNames?: () => string[];
    columnTypes?: () => string[];
  }>;
}

function fakeConn(rows: Array<Record<string, unknown>> = []): FakeConn {
  return {
    ranSql: [],
    rows,
    async run(sql: string) {
      this.ranSql.push(sql);
    },
    async runAndReadAll(sql: string) {
      this.ranSql.push(sql);
      const rs = this.rows;
      return {
        async readAll() {},
        getRowObjectsJS: () => rs,
        columnNames: () => Object.keys(rs[0] ?? {}),
        columnTypes: () => [],
      };
    },
  };
}

describe('duckdb driver', () => {
  test('testConnection attaches under a temp catalog, runs SELECT 1, and detaches', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { database: ':memory:' },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((s) => s.startsWith('ATTACH'))).toBe(true);
    expect(conn.ranSql.some((s) => s.includes('SELECT 1'))).toBe(true);
    expect(conn.ranSql.some((s) => s.startsWith('DETACH'))).toBe(true);
  });

  test('query forwards SQL via the engine connection', async () => {
    const conn = fakeConn([{ x: 1 }]);
    const driver = driverFactory({
      config: { database: ':memory:' },
      queryEngineConnection: conn,
    });
    const r = await driver.query('SELECT 1');
    expect(r.rows).toEqual([{ x: 1 }]);
  });

  test('metadata attaches, introspects information_schema, detaches', async () => {
    const conn = fakeConn([
      {
        table_schema: 'main',
        table_name: 't',
        column_name: 'c',
        data_type: 'INTEGER',
        ordinal_position: 1,
        is_nullable: 'YES',
      },
    ]);
    const driver = driverFactory({
      config: { database: ':memory:' },
      queryEngineConnection: conn,
    });
    const m = await driver.metadata();
    expect(m.driver).toBe('duckdb');
    expect(m.tables).toHaveLength(1);
  });

  test('attach lists information_schema.tables and returns paths', async () => {
    const conn = fakeConn([
      { table_schema: 'main', table_name: 'a' },
      { table_schema: 'main', table_name: 'b' },
    ]);
    const driver = driverFactory({
      config: { database: ':memory:' },
      queryEngineConnection: conn,
    });
    const r = await driver.attach!({ datasourceSlug: 'x', datasourceId: 'i' });
    expect(r.tables).toHaveLength(2);
    expect(r.tables[0]?.path).toContain('duckdb_x');
  });

  test('detach drops the catalog under its stable name', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { database: ':memory:' },
      queryEngineConnection: conn,
    });
    await driver.detach!({ datasourceSlug: 'foo' });
    expect(conn.ranSql.some((s) => s.startsWith('DETACH'))).toBe(true);
  });

  test('all methods throw when no connection is wired', async () => {
    const driver = driverFactory({ config: { database: ':memory:' } });
    await expect(driver.testConnection()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.metadata()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.query('x')).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.attach!({})).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.detach!({})).rejects.toThrow(/queryEngineConnection/);
  });
});
