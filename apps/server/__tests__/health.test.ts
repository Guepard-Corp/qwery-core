import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

describe('Server API – health and OpenAPI', () => {
  let app: Hono;
  let testDir: string;

  beforeAll(async () => {
    const out = await createTestApp();
    app = out.app;
    testDir = out.testDir;
  });

  afterAll(async () => {
    await cleanupTestDir(testDir);
  });

  describe('GET /health', () => {
    it('returns 200 and status ok', async () => {
      const res = await app.request('http://localhost/health');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/openapi.json', () => {
    it('returns OpenAPI spec', async () => {
      const res = await app.request('http://localhost/api/openapi.json');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.openapi).toBe('3.0.3');
      expect(body.info?.title).toBe('Qwery API');
      expect(typeof body.paths).toBe('object');
    });
  });
});
