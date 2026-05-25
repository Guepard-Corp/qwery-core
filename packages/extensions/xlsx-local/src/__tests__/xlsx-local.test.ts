import { describe, expect, test } from 'bun:test';
import { driverFactory, extension, schema } from '../index';
import { listSheets, sanitizeSheetName } from '../xlsx';

const FIXTURE = `${import.meta.dir}/fixtures/multi.xlsx`;

describe('xlsx workbook parsing', () => {
  test('lists every sheet in workbook order, decoding names', () => {
    expect(listSheets(FIXTURE)).toEqual(['Sales', 'Customers', 'Q1 Report']);
  });

  test('returns an empty list for an unreadable path', () => {
    expect(listSheets('/no/such/file.xlsx')).toEqual([]);
  });

  test('sanitizes sheet titles into SQL identifiers', () => {
    expect(sanitizeSheetName('Q1 Report')).toBe('q1_report');
    expect(sanitizeSheetName('2024')).toBe('v_2024');
    expect(sanitizeSheetName('Ventes & Co')).toBe('ventes___co');
  });
});

describe('xlsx-local schema', () => {
  test('accepts a minimal config with no sheet filter', () => {
    const r = schema.parse({ path: 'data/report.xlsx' });
    expect(r.path).toBe('data/report.xlsx');
    expect(r.sheet).toBeUndefined();
  });

  test('treats an empty or whitespace sheet as "all sheets"', () => {
    expect(schema.parse({ path: 'a.xlsx', sheet: '' }).sheet).toBeUndefined();
    expect(schema.parse({ path: 'a.xlsx', sheet: '   ' }).sheet).toBeUndefined();
  });

  test('keeps a concrete sheet filter', () => {
    expect(schema.parse({ path: 'a.xlsx', sheet: 'Sales' }).sheet).toBe('Sales');
  });

  test('rejects empty path', () => {
    expect(() => schema.parse({ path: '' })).toThrow();
  });
});

describe('xlsx-local extension descriptor', () => {
  test('declares its id, scope, and DuckDB driver registration', () => {
    expect(extension.id).toBe('xlsx-local');
    expect(extension.drivers[0]?.id).toBe('xlsx-local.duckdb');
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

describe('xlsx-local driver', () => {
  test('testConnection loads the excel extension and reads via read_xlsx', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: 'data/report.xlsx' },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((sql) => sql.includes('LOAD excel'))).toBe(true);
    expect(conn.ranSql.some((sql) => sql.includes('read_xlsx'))).toBe(true);
    expect(conn.ranSql.some((sql) => sql.includes('data/report.xlsx'))).toBe(true);
  });

  test('targets a specific sheet when configured', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: 'a.xlsx', sheet: 'Q1 Report' },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((sql) => sql.includes("sheet = 'Q1 Report'"))).toBe(true);
  });

  test('attach creates one view per worksheet of the workbook', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: FIXTURE },
      queryEngineConnection: conn,
    });
    const r = await driver.attach!({ schemaName: 'main' });
    expect(r.tables.map((t) => t.table)).toEqual(['sales', 'customers', 'q1_report']);
    expect(conn.ranSql.filter((sql) => sql.includes('CREATE OR REPLACE VIEW'))).toHaveLength(3);
  });

  test('attach honors a single-sheet filter', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: FIXTURE, sheet: 'Customers' },
      queryEngineConnection: conn,
    });
    const r = await driver.attach!({ schemaName: 'main' });
    expect(r.tables).toEqual([{ schema: 'main', table: 'customers', path: 'main.customers' }]);
  });

  test('falls back to all_varchar when a typed read fails on a cell conversion', async () => {
    // Mimics DuckDB: a typed read_xlsx throws on a bad cell, but the same read
    // with all_varchar succeeds. The created view must use text mode.
    const ranSql: string[] = [];
    const conn = {
      async run(sql: string) {
        ranSql.push(sql);
      },
      async runAndReadAll(sql: string) {
        ranSql.push(sql);
        if (sql.includes('read_xlsx') && !sql.includes('all_varchar')) {
          throw new Error("Could not convert string 'X' to DOUBLE");
        }
        return {
          async readAll() {},
          getRowObjectsJS: () => [],
          columnNames: () => [],
          columnTypes: () => [],
        };
      },
    };
    const driver = driverFactory({
      config: { path: 'data/report.xlsx' },
      queryEngineConnection: conn,
    });
    await driver.attach!({ schemaName: 'main' });
    const createView = ranSql.find((sql) => sql.includes('CREATE OR REPLACE VIEW'));
    expect(createView).toContain('all_varchar = true');
  });

  test('detach drops the view', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: 'a.xlsx' },
      queryEngineConnection: conn,
    });
    await driver.detach!({ schemaName: 'main', tableNames: ['data'] });
    expect(conn.ranSql.some((sql) => sql.includes('DROP VIEW IF EXISTS'))).toBe(true);
  });

  test('escapes single quotes in the path', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { path: "/tmp/it's.xlsx" },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((sql) => sql.includes("/tmp/it''s.xlsx"))).toBe(true);
  });

  test('metadata profiles every sheet as its own table', async () => {
    // Each DESCRIBE returns the same two columns; with 3 sheets we expect 3 tables.
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
      config: { path: FIXTURE },
      queryEngineConnection: conn,
    });
    const meta = await driver.metadata();
    expect(meta.tables.map((t) => t.name)).toEqual(['sales', 'customers', 'q1_report']);
    expect(meta.columns).toHaveLength(6);
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
      config: { path: 'data.xlsx' },
      queryEngineConnection: conn,
    });
    const r = await driver.query('SELECT * FROM sales');
    expect(r.rows).toHaveLength(2);
    expect(r.columns[0]?.name).toBe('a');
    expect(conn.ranSql).toEqual(['SELECT * FROM sales']);
  });

  test('query / metadata / attach / detach throw when no connection is wired', async () => {
    const driver = driverFactory({ config: { path: 'a.xlsx' } });
    await expect(driver.query('SELECT 1')).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.metadata()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.attach!({})).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.detach!({})).rejects.toThrow(/queryEngineConnection/);
  });
});
