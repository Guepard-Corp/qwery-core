import { describe, expect, test } from 'bun:test';
import { extension } from '../index';
import { schema } from '../schema';

describe('postgresql schema (union)', () => {
  test('accepts host/credential mode', () => {
    const r = schema.parse({
      host: 'localhost',
      port: 5432,
      username: 'u',
      password: 'p',
      database: 'd',
      sslmode: 'require',
    });
    expect('host' in r ? r.host : '').toBe('localhost');
  });

  test('accepts connection-URL mode', () => {
    const r = schema.parse({
      connectionUrl: 'postgresql://u:p@h:5432/d',
    });
    expect('connectionUrl' in r ? r.connectionUrl : '').toContain('postgresql://');
  });

  test('rejects when neither mode is satisfied', () => {
    expect(() => schema.parse({})).toThrow();
  });

  test('coerces port from string', () => {
    const r = schema.parse({
      host: 'h',
      port: '5432' as unknown as number,
      username: 'u',
      password: 'p',
      database: 'd',
    });
    expect('port' in r ? r.port : 0).toBe(5432);
  });

  test('rejects an invalid sslmode value', () => {
    expect(() =>
      schema.parse({
        host: 'h',
        port: 5432,
        username: 'u',
        password: 'p',
        database: 'd',
        sslmode: 'banana',
      }),
    ).toThrow();
  });
});

describe('postgresql extension', () => {
  test('registers as a datasource extension with both drivers exposed', () => {
    expect(extension.id).toBe('postgresql');
    expect(extension.drivers.length).toBeGreaterThan(0);
  });
});
