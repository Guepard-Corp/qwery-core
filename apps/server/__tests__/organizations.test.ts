import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

describe('Server API – Organizations', () => {
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

  describe('Organizations CRUD', () => {
    it('POST /api/organizations creates and GET returns list', async () => {
      const createRes = await app.request(
        'http://localhost/api/organizations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Org',
            userId: '550e8400-e29b-41d4-a716-446655440000',
            createdBy: 'test',
          }),
        },
      );
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: string; slug: string };
      expect(created.id).toBeDefined();
      expect(created.slug).toBeDefined();

      const listRes = await app.request('http://localhost/api/organizations');
      expect(listRes.status).toBe(200);
      const list = (await listRes.json()) as Array<{ id: string }>;
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.some((o) => o.id === created.id)).toBe(true);
    });

    it('GET /api/organizations/:id returns organization by id', async () => {
      const listRes = await app.request('http://localhost/api/organizations');
      const list = (await listRes.json()) as Array<{ id: string }>;
      if (list.length === 0) return;
      const id = list[0].id;
      const res = await app.request(`http://localhost/api/organizations/${id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string };
      expect(body.id).toBe(id);
    });
  });

  describe('Organizations bulk', () => {
    it('POST /api/organizations/bulk with invalid body returns 400', async () => {
      const res = await app.request('http://localhost/api/organizations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: number; details?: string };
      expect(body.code).toBe(400);
      expect(body.details).toContain('Invalid request body');
    });

    it('POST /api/organizations/bulk delete removes organizations', async () => {
      const createRes = await app.request(
        'http://localhost/api/organizations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Bulk Delete Org',
            userId: '550e8400-e29b-41d4-a716-446655440000',
            createdBy: 'test',
          }),
        },
      );
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: string };

      const bulkRes = await app.request(
        'http://localhost/api/organizations/bulk',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'delete', ids: [created.id] }),
        },
      );
      expect(bulkRes.status).toBe(200);
      const bulkBody = (await bulkRes.json()) as {
        success: boolean;
        deletedCount: number;
      };
      expect(bulkBody.success).toBe(true);
      expect(bulkBody.deletedCount).toBe(1);

      const listRes = await app.request('http://localhost/api/organizations');
      const list = (await listRes.json()) as Array<{ id: string }>;
      expect(list.some((o) => o.id === created.id)).toBe(false);
    });
  });
});
