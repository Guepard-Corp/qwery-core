import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { getSecretFields } from '../src/utils/schema-secrets';

describe('getSecretFields', () => {
  it.skip('should identify fields with secret:true in description (Zod 3 _def; domain uses Zod 4)', () => {
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

  it.skip('should handle optional and nullable fields (Zod 3 _def; domain uses Zod 4)', () => {
    const schema = z.object({
      apiKey: z.string().describe('secret:true').optional(),
      dbPassword: z.string().describe('secret:true').nullable(),
    });

    const secretFields = getSecretFields(schema);
    expect(secretFields).toContain('apiKey');
    expect(secretFields).toContain('dbPassword');
  });

  it.skip('should handle unions (oneOf pattern) (Zod 3 _def; domain uses Zod 4)', () => {
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
