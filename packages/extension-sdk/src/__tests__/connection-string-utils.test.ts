import { describe, expect, test } from 'bun:test';
import {
  buildClickHouseConnectionUrl,
  buildMysqlConnectionUrl,
  buildPostgresConnectionUrl,
  cleanPostgresConnectionUrl,
  extractConnectionUrl,
  extractGenericUrl,
  extractPath,
} from '../connection-string-utils';

describe('extractGenericUrl', () => {
  test('returns the first matching key, trimmed', () => {
    expect(extractGenericUrl({ url: '  postgres://x  ' }, ['url'])).toBe('postgres://x');
  });

  test('returns null when no key matches or value is empty', () => {
    expect(extractGenericUrl({ url: '   ' }, ['url'])).toBeNull();
    expect(extractGenericUrl({}, ['url', 'connectionUrl'])).toBeNull();
  });

  test('prefers earlier keys', () => {
    expect(extractGenericUrl({ url: 'first', connectionUrl: 'second' }, ['url', 'connectionUrl'])).toBe(
      'first',
    );
  });
});

describe('extractPath', () => {
  test('aliases extractGenericUrl', () => {
    expect(extractPath({ path: '/data/db' }, ['path'])).toBe('/data/db');
  });
});

describe('buildPostgresConnectionUrl', () => {
  test('builds a complete URL with sslmode=prefer by default', () => {
    expect(
      buildPostgresConnectionUrl({
        host: 'h',
        port: 5432,
        username: 'u',
        password: 'p',
        database: 'd',
      }),
    ).toBe('postgresql://u:p@h:5432/d?sslmode=prefer');
  });

  test('encodes special characters in user/password', () => {
    const url = buildPostgresConnectionUrl({
      host: 'h',
      username: 'a@b',
      password: '$ecr#t',
      database: 'd',
    });
    expect(url).toContain(encodeURIComponent('a@b'));
    expect(url).toContain(encodeURIComponent('$ecr#t'));
  });

  test('uses require sslmode when ssl=true is set', () => {
    expect(buildPostgresConnectionUrl({ host: 'h', ssl: true })).toContain('sslmode=require');
  });

  test('falls back to localhost:5432', () => {
    expect(buildPostgresConnectionUrl({})).toContain('localhost:5432');
  });
});

describe('buildMysqlConnectionUrl', () => {
  test('defaults to root@localhost:3306', () => {
    expect(buildMysqlConnectionUrl({})).toBe('mysql://root@localhost:3306');
  });

  test('appends ?ssl=true when requested', () => {
    expect(buildMysqlConnectionUrl({ host: 'h', ssl: true })).toContain('ssl=true');
  });

  test('encodes credentials', () => {
    const url = buildMysqlConnectionUrl({
      host: 'h',
      username: 'a@b',
      password: 'p$1',
      database: 'd',
    });
    expect(url).toContain(encodeURIComponent('a@b'));
    expect(url).toContain(encodeURIComponent('p$1'));
  });
});

describe('buildClickHouseConnectionUrl', () => {
  test('uses https + 8443 when ssl=true', () => {
    expect(buildClickHouseConnectionUrl({ host: 'h', ssl: true })).toContain('https://');
    expect(buildClickHouseConnectionUrl({ host: 'h', ssl: true })).toContain(':8443');
  });

  test('uses http + 8123 by default', () => {
    const url = buildClickHouseConnectionUrl({ host: 'h' });
    expect(url).toContain('http://');
    expect(url).toContain(':8123');
  });

  test('appends database when not "default"', () => {
    expect(buildClickHouseConnectionUrl({ host: 'h', database: 'analytics' })).toContain(
      'database=analytics',
    );
  });
});

describe('cleanPostgresConnectionUrl', () => {
  test('removes channel_binding parameter', () => {
    const cleaned = cleanPostgresConnectionUrl(
      'postgres://u:p@h:5432/d?sslmode=prefer&channel_binding=require',
    );
    expect(cleaned).not.toContain('channel_binding');
  });

  test('changes sslmode=disable to sslmode=prefer', () => {
    const cleaned = cleanPostgresConnectionUrl('postgres://u:p@h:5432/d?sslmode=disable');
    expect(cleaned).toContain('sslmode=prefer');
    expect(cleaned).not.toContain('sslmode=disable');
  });

  test('adds sslmode=prefer when missing', () => {
    const cleaned = cleanPostgresConnectionUrl('postgres://u:p@h:5432/d');
    expect(cleaned).toContain('sslmode=prefer');
  });

  test('falls back to string surgery when URL parsing fails', () => {
    const cleaned = cleanPostgresConnectionUrl('not-a-real-url?channel_binding=require&sslmode=disable');
    expect(cleaned).not.toContain('channel_binding');
    expect(cleaned).toContain('sslmode=prefer');
  });
});

describe('extractConnectionUrl', () => {
  test('Postgres: uses connectionUrl when present and cleans it', () => {
    const r = extractConnectionUrl(
      { connectionUrl: 'postgres://u:p@h/d?channel_binding=require' },
      'postgresql',
    );
    expect(r).not.toContain('channel_binding');
  });

  test('Postgres: builds URL from fields when no connectionUrl', () => {
    const r = extractConnectionUrl({ host: 'h', username: 'u', password: 'p', database: 'd' }, 'postgres');
    expect(r).toMatch(/^postgresql:\/\//);
  });

  test('Postgres: rejects when neither connectionUrl nor host is set', () => {
    expect(() => extractConnectionUrl({}, 'postgres')).toThrow(/requires/);
  });

  test('MySQL: builds URL from fields', () => {
    const r = extractConnectionUrl({ host: 'h', username: 'u', database: 'd' }, 'mysql');
    expect(r).toMatch(/^mysql:\/\//);
  });

  test('SQLite: requires path/database/connectionUrl', () => {
    expect(() => extractConnectionUrl({}, 'sqlite')).toThrow(/requires path/);
    expect(extractConnectionUrl({ path: '/tmp/db.sqlite' }, 'sqlite')).toBe('/tmp/db.sqlite');
  });

  test('rejects unsupported providers', () => {
    expect(() => extractConnectionUrl({ host: 'h' }, 'made-up')).toThrow(/Unsupported provider/);
  });
});
