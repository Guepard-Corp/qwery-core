import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

describe('Server API – Datasources', () => {
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

  describe('Datasources', () => {
    it('GET /api/datasources without projectId returns 400', async () => {
      const res = await app.request('http://localhost/api/datasources');
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('projectId');
    });
  });
});
