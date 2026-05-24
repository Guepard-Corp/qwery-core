import { describe, expect, test } from 'bun:test';
import { buildS3UrlPattern, buildSecretSql, driverFactory } from '../driver';
import { schema } from '../schema';

const base = {
  provider: 'aws' as const,
  aws_access_key_id: 'AKIA',
  aws_secret_access_key: 'sekret',
  region: 'us-east-1',
  bucket: 'my-bucket',
  format: 'parquet' as const,
};

describe('buildS3UrlPattern', () => {
  test('defaults to a recursive glob for the chosen format', () => {
    expect(buildS3UrlPattern(schema.parse(base))).toBe('s3://my-bucket/**/*.parquet');
    expect(buildS3UrlPattern(schema.parse({ ...base, format: 'json' }))).toBe('s3://my-bucket/**/*.json');
  });

  test('trims slashes around the prefix', () => {
    expect(buildS3UrlPattern(schema.parse({ ...base, prefix: '/events/' }))).toBe(
      's3://my-bucket/events/**/*.parquet',
    );
  });

  test('honors an explicit include glob', () => {
    expect(buildS3UrlPattern(schema.parse({ ...base, includes: ['year=2026/*.parquet'] }))).toBe(
      's3://my-bucket/year=2026/*.parquet',
    );
  });
});

describe('buildSecretSql', () => {
  test('emits credentials and escapes single quotes', () => {
    const sql = buildSecretSql(schema.parse({ ...base, aws_secret_access_key: "a'b" }));
    expect(sql).toContain("KEY_ID 'AKIA'");
    expect(sql).toContain("SECRET 'a''b'"); // escaped
    expect(sql).toContain("REGION 'us-east-1'");
    expect(sql).not.toContain('ENDPOINT'); // AWS without custom endpoint
  });

  test('derives a DigitalOcean endpoint with vhost url style', () => {
    const sql = buildSecretSql(schema.parse({ ...base, provider: 'digitalocean', region: 'nyc3' }));
    expect(sql).toContain("ENDPOINT 'nyc3.digitaloceanspaces.com'");
    expect(sql).toContain("URL_STYLE 'vhost'");
  });

  test('uses a custom endpoint with path style for minio', () => {
    const sql = buildSecretSql(
      schema.parse({ ...base, provider: 'minio', endpoint_url: 'https://minio.local:9000' }),
    );
    expect(sql).toContain("ENDPOINT 'minio.local:9000'");
    expect(sql).toContain("URL_STYLE 'path'");
  });

  test('includes the session token when set', () => {
    const sql = buildSecretSql(schema.parse({ ...base, aws_session_token: 'tok' }));
    expect(sql).toContain("SESSION_TOKEN 'tok'");
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

function fakeConn(rows: Array<Record<string, unknown>> = []): FakeConn {
  return {
    ranSql: [],
    async run(sql: string) {
      this.ranSql.push(sql);
    },
    async runAndReadAll(sql: string) {
      this.ranSql.push(sql);
      return {
        async readAll() {},
        getRowObjectsJS: () => rows,
        columnNames: () => Object.keys(rows[0] ?? {}),
        columnTypes: () => [],
      };
    },
  };
}

describe('s3 driver', () => {
  test('testConnection installs httpfs, creates the secret, and reads via read_parquet', async () => {
    const conn = fakeConn();
    const driver = driverFactory({ config: base, queryEngineConnection: conn });
    await driver.testConnection();
    expect(conn.ranSql.some((s) => s.includes('INSTALL httpfs'))).toBe(true);
    expect(conn.ranSql.some((s) => s.includes('CREATE OR REPLACE SECRET'))).toBe(true);
    expect(conn.ranSql.some((s) => s.includes('read_parquet'))).toBe(true);
  });

  test('format=json switches to read_json_auto', async () => {
    const conn = fakeConn();
    const driver = driverFactory({
      config: { ...base, format: 'json' as const },
      queryEngineConnection: conn,
    });
    await driver.testConnection();
    expect(conn.ranSql.some((s) => s.includes('read_json_auto'))).toBe(true);
  });

  test('metadata returns the DESCRIBE rows as DatasourceMetadata', async () => {
    const conn = fakeConn([{ column_name: 'id', column_type: 'BIGINT' }]);
    const driver = driverFactory({ config: base, queryEngineConnection: conn });
    const m = await driver.metadata();
    expect(m.columns).toHaveLength(1);
  });

  test('query forwards SQL and returns the result set', async () => {
    const conn = fakeConn([{ a: 1 }, { a: 2 }]);
    const driver = driverFactory({ config: base, queryEngineConnection: conn });
    const r = await driver.query('SELECT a FROM data');
    expect(r.rows).toHaveLength(2);
  });

  test('attach creates a view; detach drops it', async () => {
    const conn = fakeConn();
    const driver = driverFactory({ config: base, queryEngineConnection: conn });
    const a = await driver.attach!({ schemaName: 'main', viewName: 'sales' });
    expect(a.tables[0]?.path).toBe('main.sales');
    await driver.detach!({ schemaName: 'main', tableNames: ['sales'] });
    expect(conn.ranSql.some((s) => s.includes('DROP VIEW'))).toBe(true);
  });

  test('all methods throw when no connection is wired', async () => {
    const driver = driverFactory({ config: base });
    await expect(driver.testConnection()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.metadata()).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.query('x')).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.attach!({})).rejects.toThrow(/queryEngineConnection/);
    await expect(driver.detach!({})).rejects.toThrow(/queryEngineConnection/);
  });
});
