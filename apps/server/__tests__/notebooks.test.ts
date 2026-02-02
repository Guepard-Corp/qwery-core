import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

describe('Server API – Notebooks', () => {
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

  describe('Notebooks CRUD', () => {
    it('GET /api/notebooks returns list', async () => {
      const res = await app.request('http://localhost/api/notebooks');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });
});
