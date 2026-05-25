import { describe, expect, test } from 'bun:test';
import { driverFactory, extension } from '../index';
import { schema } from '../schema';

describe('csv-online schema', () => {
  test('accepts a valid URL with default viewName', () => {
    const r = schema.parse({ url: 'https://example.com/data.csv' });
    expect(r.viewName).toBe('data');
  });

  test('rejects a non-URL string', () => {
    expect(() => schema.parse({ url: 'not-a-url' })).toThrow();
  });

  test('rejects invalid viewName', () => {
    expect(() => schema.parse({ url: 'https://x/y.csv', viewName: '1bad' })).toThrow();
  });
});

describe('csv-online extension descriptor', () => {
  test('registers as a datasource extension', () => {
    expect(extension.id).toBe('csv-online');
  });
});

interface FakeConn {
  ranSql: string[];
  run(sql: string): Promise<void>;
  runAndReadAll(sql: string): Promise<{
    readAll(): Promise<void>;
    getRowObjectsJS(): Array<Record<string, unknown>>;
    columnNames?: () => string[];
    columnTypes?: () => string[];
  }>;
}

function fakeConn(): FakeConn {
  return {
    ranSql: [],
    async run(sql: string) {
      this.ranSql.push(sql);
    },
    async runAndReadAll(sql: string) {
      this.ranSql.push(sql);
      return {
        async readAll() {},
        getRowObjectsJS() {
          return [];
        },
        columnNames: () => [],
        columnTypes: () => [],
      };
    },
  };
}

describe('csv-online driver', () => {
  test('testConnection installs httpfs then reads via read_csv_auto', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { url: 'https://example.com/data.csv' },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((s) => s.includes('INSTALL httpfs'))).toBe(true);
    expect(conn.ranSql.some((s) => s.includes('read_csv_auto'))).toBe(true);
  });

  test('attach + detach manage views', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { url: 'https://example.com/data.csv', viewName: 'sales' },
      queryEngineConnection: conn,
    });
    const a = await driver.attach!({ schemaName: 'main', viewName: 'sales' });
    expect(a.tables[0]?.path).toBe('main.sales');
    await driver.detach!({ schemaName: 'main', tableNames: ['sales'] });
    expect(conn.ranSql.some((s) => s.includes('DROP VIEW'))).toBe(true);
  });

  test('query forwards SQL and returns the result set', async () => {
    const conn = {
      async run() {},
      async runAndReadAll(_sql: string) {
        return {
          async readAll() {},
          getRowObjectsJS: () => [{ x: 1 }],
          columnNames: () => ['x'],
          columnTypes: () => ['INT'],
        };
      },
    };
    const driver = driverFactory({
      config: { url: 'https://example.com/data.csv' },
      queryEngineConnection: conn,
    });
    const r = await driver.query('SELECT 1');
    expect(r.rows).toEqual([{ x: 1 }]);
  });

  test('metadata uses read_csv_auto DESCRIBE rows', async () => {
    const conn = {
      async run() {},
      async runAndReadAll(_sql: string) {
        return {
          async readAll() {},
          getRowObjectsJS: () => [{ column_name: 'id', column_type: 'INTEGER' }],
          columnNames: () => [],
          columnTypes: () => [],
        };
      },
    };
    const driver = driverFactory({
      config: { url: 'https://example.com/data.csv' },
      queryEngineConnection: conn,
    });
    const meta = await driver.metadata();
    expect(meta.columns).toHaveLength(1);
  });

  test('all methods throw when no connection is wired', async () => {
    const driver = driverFactory({ config: { url: 'https://example.com/data.csv' } });
    await expect(driver.query('x')).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.metadata()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.attach!({})).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.detach!({})).rejects.toThrow(/queryEngineConnection/);
  });
});
