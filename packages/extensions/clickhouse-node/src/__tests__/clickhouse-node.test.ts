import { describe, expect, test } from 'bun:test';
import { buildClickHouseConfig } from '../driver';
import { schema } from '../schema';

describe('clickhouse schema (union)', () => {
  test('host-&-credentials branch applies defaults', () => {
    const cfg = schema.parse({ host: 'ch.local' });
    expect(cfg).toMatchObject({ host: 'ch.local', port: 8123, username: 'default', database: 'default' });
  });

  test('connection-URL branch', () => {
    const cfg = schema.parse({ connectionUrl: 'clickhouse://u:p@ch.local:8123/analytics' });
    expect(cfg).toMatchObject({ connectionUrl: 'clickhouse://u:p@ch.local:8123/analytics' });
  });
});

describe('buildClickHouseConfig', () => {
  test('maps clickhouse:// to an http host and decodes credentials', () => {
    expect(buildClickHouseConfig('clickhouse://us%40r:p%40ss@ch.local:8123/analytics')).toEqual({
      host: 'http://ch.local:8123',
      username: 'us@r',
      password: 'p@ss',
      database: 'analytics',
    });
  });

  test('keeps an explicit http(s) scheme and defaults database to "default"', () => {
    expect(buildClickHouseConfig('https://ch.example.com:8443')).toEqual({
      host: 'https://ch.example.com:8443',
      username: 'default',
      password: '',
      database: 'default',
    });
  });
});
