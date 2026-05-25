import { describe, expect, test } from 'bun:test';
import { driverFactory, extension } from '../index';
import { schema } from '../schema';

describe('json-online schema', () => {
  test('accepts a URL with default viewName', () => {
    const r = schema.parse({ url: 'https://example.com/data.json' });
    expect(r.viewName).toBe('data');
  });

  test('rejects a non-URL', () => {
    expect(() => schema.parse({ url: 'not-a-url' })).toThrow();
  });
});

describe('json-online extension descriptor', () => {
  test('registers as a datasource extension', () => {
    expect(extension.id).toBe('json-online');
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

describe('json-online driver', () => {
  test('testConnection installs httpfs + reads via read_json_auto', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { url: 'https://example.com/data.json' },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((s) => s.includes('INSTALL httpfs'))).toBe(true);
    expect(conn.ranSql.some((s) => s.includes('read_json_auto'))).toBe(true);
  });

  test('attach creates a view', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { url: 'https://example.com/data.json', viewName: 'orders' },
      queryEngineConnection: conn,
    });
    const a = await driver.attach!({ schemaName: 'main', viewName: 'orders' });
    expect(a.tables[0]?.path).toBe('main.orders');
  });

  test('detach drops the view', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { url: 'https://example.com/data.json', viewName: 'orders' },
      queryEngineConnection: conn,
    });
    await driver.detach!({ schemaName: 'main', tableNames: ['orders'] });
    expect(conn.ranSql.some((s) => s.includes('DROP VIEW'))).toBe(true);
  });

  test('query forwards SQL', async () => {
    const conn = {
      async run() {},
      async runAndReadAll() {
        return {
          async readAll() {},
          getRowObjectsJS: () => [{ a: 1 }],
          columnNames: () => ['a'],
          columnTypes: () => ['INT'],
        };
      },
    };
    const driver = driverFactory({
      config: { url: 'https://example.com/data.json' },
      queryEngineConnection: conn,
    });
    const r = await driver.query('SELECT 1');
    expect(r.rows).toEqual([{ a: 1 }]);
  });

  test('metadata uses DESCRIBE rows', async () => {
    const conn = {
      async run() {},
      async runAndReadAll() {
        return {
          async readAll() {},
          getRowObjectsJS: () => [{ column_name: 'a', column_type: 'INT' }],
          columnNames: () => [],
          columnTypes: () => [],
        };
      },
    };
    const driver = driverFactory({
      config: { url: 'https://example.com/data.json' },
      queryEngineConnection: conn,
    });
    expect((await driver.metadata()).columns).toHaveLength(1);
  });

  test('throws when no connection is wired', async () => {
    const driver = driverFactory({ config: { url: 'https://example.com/data.json' } });
    await expect(driver.query('x')).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.metadata()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.attach!({})).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.detach!({})).rejects.toThrow(/queryEngineConnection/);
  });
});
