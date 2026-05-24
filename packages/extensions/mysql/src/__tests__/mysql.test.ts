import { describe, expect, test } from 'bun:test';
import { buildMysqlAttachDsn, buildMysqlConfig, catalogNameFor } from '../driver';
import { schema } from '../schema';

describe('mysql schema (union)', () => {
  test('accepts the host-&-credentials branch with defaults', () => {
    const cfg = schema.parse({ host: 'db.local', username: 'root', password: 'pw', database: 'app' });
    expect(cfg).toMatchObject({ host: 'db.local', port: 3306, ssl: false });
  });

  test('accepts the connection-URL branch', () => {
    const cfg = schema.parse({ connectionUrl: 'mysql://root:pw@db.local:3306/app' });
    expect(cfg).toMatchObject({ connectionUrl: 'mysql://root:pw@db.local:3306/app' });
  });
});

describe('buildMysqlConfig (native client)', () => {
  test('parses a mysql:// URL into a mysql2 config and decodes credentials', () => {
    expect(buildMysqlConfig('mysql://us%40r:p%40ss@db.local:3307/app')).toEqual({
      host: 'db.local',
      port: 3307,
      user: 'us@r',
      password: 'p@ss',
      database: 'app',
      ssl: undefined,
    });
  });

  test('defaults port to 3306 and enables ssl via ?ssl=true', () => {
    const cfg = buildMysqlConfig('mysql://root@h/d?ssl=true');
    expect(cfg.port).toBe(3306);
    expect(cfg.ssl).toEqual({ rejectUnauthorized: false });
  });
});

describe('buildMysqlAttachDsn (DuckDB scanner federation)', () => {
  test('derives a libmysql key=value DSN (not a URL)', () => {
    expect(buildMysqlAttachDsn('mysql://root:pw@db.local:3307/app')).toBe(
      'host=db.local port=3307 user=root password=pw database=app',
    );
  });

  test('defaults the port to 3306 and decodes credentials', () => {
    expect(buildMysqlAttachDsn('mysql://us%40r:p%40ss@h/d')).toBe(
      'host=h port=3306 user=us@r password=p@ss database=d',
    );
  });
});

describe('catalogNameFor', () => {
  test('prefixes mysql_ and sanitizes', () => {
    expect(catalogNameFor('Prod-DB')).toBe('mysql_prod_db');
  });
});
