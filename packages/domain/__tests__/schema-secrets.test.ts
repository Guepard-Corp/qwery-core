import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { getSecretFields } from '../src/utils/schema-secrets';

describe('getSecretFields', () => {
  it('should identify fields with secret:true in description', () => {
    const schema = z.object({
      host: z.string(),
      password: z.string().describe('secret:true'),
      token: z.string().describe('This is a secret:true field'),
      port: z.number(),
    });

    const secretFields = getSecretFields(schema);
    expect(secretFields).toContain('password');
    expect(secretFields).toContain('token');
    expect(secretFields).not.toContain('host');
    expect(secretFields).not.toContain('port');
  });

  it('should handle optional and nullable fields', () => {
    const schema = z.object({
      apiKey: z.string().describe('secret:true').optional(),
      dbPassword: z.string().describe('secret:true').nullable(),
    });

    const secretFields = getSecretFields(schema);
    expect(secretFields).toContain('apiKey');
    expect(secretFields).toContain('dbPassword');
  });

  it('should handle unions (oneOf pattern)', () => {
    const schema = z.union([
      z.object({
        connectionUrl: z.string().describe('secret:true'),
      }),
      z.object({
        host: z.string(),
        password: z.string().describe('secret:true'),
      }),
    ]);

    const secretFields = getSecretFields(schema);
    expect(secretFields).toContain('connectionUrl');
    expect(secretFields).toContain('password');
    expect(secretFields).not.toContain('host');
  });
});
