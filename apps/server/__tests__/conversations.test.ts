import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

describe('Server API – Conversations', () => {
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

  describe('Conversations CRUD', () => {
    it('GET /api/conversations returns list', async () => {
      const res = await app.request('http://localhost/api/conversations');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('POST /api/conversations creates conversation', async () => {
      const createRes = await app.request(
        'http://localhost/api/conversations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Conversation',
            seedMessage: '',
            createdBy: 'test',
          }),
        },
      );
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: string; slug: string };
      expect(created.id).toBeDefined();
      expect(created.slug).toBeDefined();
    });
  });
});
