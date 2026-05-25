import { describe, expect, test } from 'bun:test';
import { driverFactory, extension } from '../index';
import { isRemoteSource, schema } from '../schema';

describe('parquet schema', () => {
  test('accepts local source with default viewName', () => {
    const r = schema.parse({ source: 'data/sales.parquet' });
    expect(r.viewName).toBe('data');
  });

  test('accepts http source', () => {
    expect(() => schema.parse({ source: 'https://example.com/data.parquet' })).not.toThrow();
  });

  test('rejects invalid viewName', () => {
    expect(() => schema.parse({ source: 'a.parquet', viewName: '1-x' })).toThrow();
  });
});

describe('isRemoteSource', () => {
  test('identifies http(s) URLs as remote', () => {
    expect(isRemoteSource('https://x/y.parquet')).toBe(true);
    expect(isRemoteSource('http://x/y.parquet')).toBe(true);
  });

  test('rejects local paths', () => {
    expect(isRemoteSource('/tmp/a.parquet')).toBe(false);
    expect(isRemoteSource('data/a.parquet')).toBe(false);
  });

  test('rejects s3:// (handled by the s3 extension instead)', () => {
    expect(isRemoteSource('s3://bucket/x.parquet')).toBe(false);
  });
});

describe('parquet extension descriptor', () => {
  test('declares its id + provider format', () => {
    expect(extension.id).toBe('parquet');
    expect(extension.drivers[0]?.id).toContain('parquet');
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

describe('parquet driver — local path', () => {
  test('testConnection uses read_parquet, does NOT install httpfs', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { source: 'data/sales.parquet' },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((sql) => sql.includes('read_parquet'))).toBe(true);
    expect(conn.ranSql.some((sql) => sql.includes('httpfs'))).toBe(false);
  });

  test('attach creates a view', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { source: 'data/sales.parquet', viewName: 'sales' },
      queryEngineConnection: conn,
    });
    const r = await driver.attach!({ viewName: 'sales' });
    expect(r.tables[0]?.path).toBe('main.sales');
  });
});

describe('parquet driver — remote URL', () => {
  test('testConnection installs + loads httpfs for http sources', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { source: 'https://example.com/x.parquet' },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((sql) => sql.includes('INSTALL httpfs'))).toBe(true);
    expect(conn.ranSql.some((sql) => sql.includes('LOAD httpfs'))).toBe(true);
  });
});

describe('parquet driver — query / metadata / errors', () => {
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
      config: { source: 'data.parquet' },
      queryEngineConnection: conn,
    });
    const r = await driver.query('SELECT 1');
    expect(r.rows).toEqual([{ a: 1 }]);
  });

  test('metadata uses DESCRIBE', async () => {
    const conn = {
      async run() {},
      async runAndReadAll() {
        return {
          async readAll() {},
          getRowObjectsJS: () => [{ column_name: 'x', column_type: 'INT' }],
          columnNames: () => [],
          columnTypes: () => [],
        };
      },
    };
    const driver = driverFactory({
      config: { source: 'data.parquet' },
      queryEngineConnection: conn,
    });
    expect((await driver.metadata()).columns).toHaveLength(1);
  });

  test('detach drops the view', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { source: 'data.parquet', viewName: 'foo' },
      queryEngineConnection: conn,
    });
    await driver.detach!({ schemaName: 'main', tableNames: ['foo'] });
    expect(conn.ranSql.some((s) => s.includes('DROP VIEW'))).toBe(true);
  });

  test('throws when no connection is wired', async () => {
    const driver = driverFactory({ config: { source: 'a.parquet' } });
    await expect(driver.query('x')).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.metadata()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.attach!({})).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.detach!({})).rejects.toThrow(/queryEngineConnection/);
  });
});
