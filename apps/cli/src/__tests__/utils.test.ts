import { describe, it, expect } from 'vitest';
import { CliUsageError } from '../utils/errors';
import { createIdentity } from '../utils/identity';
import {
  parseConnectionString,
  connectionDescription,
} from '../utils/connection-string';

describe('utils', () => {
  describe('CliUsageError', () => {
    it('creates error with default exit code', () => {
      const error = new CliUsageError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.exitCode).toBe(1);
    });

    it('creates error with custom exit code', () => {
      const error = new CliUsageError('Test error', 2);
      expect(error.exitCode).toBe(2);
    });
  });

  describe('createIdentity', () => {
    it('generates unique IDs', () => {
      const id1 = createIdentity();
      const id2 = createIdentity();
      expect(id1.id).not.toBe(id2.id);
    });

    it('generates slug from name', () => {
      const identity = createIdentity();
      expect(identity.slug).toBeDefined();
      expect(typeof identity.slug).toBe('string');
    });

    it('generates valid UUID format', () => {
      const identity = createIdentity();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(identity.id).toMatch(uuidRegex);
    });
  });

  describe('parseConnectionString', () => {
    it('parses PostgreSQL connection string', () => {
      const url =
        'postgresql://user:pass@localhost:5432/mydb?sslmode=require';
      const parsed = parseConnectionString(url);
      expect(parsed.protocol).toBe('postgresql');
      expect(parsed.username).toBe('user');
      expect(parsed.host).toBe('localhost');
      expect(parsed.port).toBe('5432');
      expect(parsed.database).toBe('mydb');
      expect(parsed.searchParams.get('sslmode')).toBe('require');
    });

    it('handles connection string without port', () => {
      const url = 'postgresql://user:pass@localhost/mydb';
      const parsed = parseConnectionString(url);
      expect(parsed.host).toBe('localhost');
      expect(parsed.port).toBeUndefined();
    });

    it('handles connection string without password', () => {
      const url = 'postgresql://user@localhost/mydb';
      const parsed = parseConnectionString(url);
      expect(parsed.username).toBe('user');
    });
  });

  describe('connectionDescription', () => {
    it('generates description from parsed connection', () => {
      const url =
        'postgresql://user:pass@localhost:5432/mydb?sslmode=require';
      const parsed = parseConnectionString(url);
      const desc = connectionDescription(parsed);
      expect(desc).toContain('localhost');
      expect(desc).toContain('mydb');
    });
  });
});

