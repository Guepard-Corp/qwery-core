import { describe, expect, test } from 'bun:test';
import { driverFactory, extension, schema } from '../index';

describe('csv-local schema', () => {
  test('accepts a minimal config and applies the default viewName', () => {
    const r = schema.parse({ path: 'data/sales.csv' });
    expect(r.path).toBe('data/sales.csv');
    expect(r.viewName).toBe('data');
  });

  test('honors a custom viewName', () => {
    const r = schema.parse({ path: 'a.csv', viewName: 'sales' });
    expect(r.viewName).toBe('sales');
  });

  test('rejects empty path', () => {
    expect(() => schema.parse({ path: '' })).toThrow();
  });

  test('rejects a viewName that is not a valid SQL identifier', () => {
    expect(() => schema.parse({ path: 'a.csv', viewName: '1bad-name' })).toThrow();
  });
});

describe('csv-local extension descriptor', () => {
  test('declares its id, scope, and DuckDB driver registration', () => {
    expect(extension.id).toBe('csv-local');
    expect(extension.drivers[0]?.id).toBe('csv-local.duckdb');
  });
});

interface FakeConn {
  ranSql: string[];
  rowObjects: Array<Record<string, unknown>>;
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
    rowObjects: rows,
    async run(sql: string) {
      this.ranSql.push(sql);
    },
    async runAndReadAll(sql: string) {
      this.ranSql.push(sql);
      const row = this.rowObjects;
      return {
        async readAll() {
          /* no-op */
        },
        getRowObjectsJS() {
          return row;
        },
        columnNames: () => [],
        columnTypes: () => [],
      };
    },
  };
}

describe('csv-local driver', () => {
  test('testConnection runs a SELECT against read_csv_auto', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: 'data/sales.csv' },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((sql) => sql.includes('read_csv_auto'))).toBe(true);
    expect(conn.ranSql.some((sql) => sql.includes('data/sales.csv'))).toBe(true);
  });

  test('testConnection throws when no queryEngineConnection is wired', async () => {
    const driver = driverFactory({ config: { path: 'a.csv' } });
    await expect(driver.testConnection()).rejects.toThrow(/queryEngineConnection/);
  });

  test('attach creates a view named after viewName', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: 'data/sales.csv', viewName: 'sales' },
      queryEngineConnection: conn,
    });
    const r = await driver.attach!({ schemaName: 'main', viewName: 'sales' });
    expect(r.tables[0]).toEqual({ schema: 'main', table: 'sales', path: 'main.sales' });
    expect(conn.ranSql.some((sql) => sql.includes('CREATE OR REPLACE VIEW'))).toBe(true);
  });

  test('detach drops the view', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: 'a.csv', viewName: 'data' },
      queryEngineConnection: conn,
    });
    await driver.detach!({ schemaName: 'main', tableNames: ['data'] });
    expect(conn.ranSql.some((sql) => sql.includes('DROP VIEW IF EXISTS'))).toBe(true);
  });

  test('detach uses default viewName when tableNames omitted', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: 'a.csv', viewName: 'foo' },
      queryEngineConnection: conn,
    });
    await driver.detach!({ schemaName: 'main' });
    expect(conn.ranSql.some((sql) => sql.includes('"foo"'))).toBe(true);
  });

  test('escapes single quotes in the path', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: "/tmp/it's.csv" },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql[0]).toContain("/tmp/it''s.csv");
  });

  test('query forwards the SQL and returns the result set', async () => {
    const conn = {
      ranSql: [] as string[],
      async run() {},
      async runAndReadAll(sql: string) {
        this.ranSql.push(sql);
        return {
          async readAll() {},
          getRowObjectsJS: () => [{ a: 1 }, { a: 2 }],
          columnNames: () => ['a'],
          columnTypes: () => ['INT'],
        };
      },
    };
    const driver = driverFactory({
      config: { path: 'data.csv' },
      queryEngineConnection: conn,
    });
    const r = await driver.query('SELECT * FROM data');
    expect(r.rows).toHaveLength(2);
    expect(r.columns[0]?.name).toBe('a');
    expect(conn.ranSql).toEqual(['SELECT * FROM data']);
  });

  test('metadata builds a single-table descriptor from DESCRIBE rows', async () => {
    const conn = {
      async run() {},
      async runAndReadAll(_sql: string) {
        return {
          async readAll() {},
          getRowObjectsJS: () => [
            { column_name: 'id', column_type: 'INTEGER', null: 'NO' },
            { column_name: 'name', column_type: 'VARCHAR', null: 'YES' },
          ],
          columnNames: () => [],
          columnTypes: () => [],
        };
      },
    };
    const driver = driverFactory({
      config: { path: 'a.csv', viewName: 'data' },
      queryEngineConnection: conn,
    });
    const meta = await driver.metadata();
    expect(meta.tables).toHaveLength(1);
    expect(meta.columns).toHaveLength(2);
  });

  test('query / metadata throw when no connection is wired', async () => {
    const driver = driverFactory({ config: { path: 'a.csv' } });
    await expect(driver.query('SELECT 1')).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.metadata()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.attach!({})).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.detach!({})).rejects.toThrow(/queryEngineConnection/);
  });
});
