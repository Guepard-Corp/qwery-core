import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

describe('Server API – Projects', () => {
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

  describe('Projects CRUD', () => {
    it('GET /api/projects requires orgId', async () => {
      const res = await app.request('http://localhost/api/projects');
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: number; details?: string };
      expect(body.code).toBe(400);
      expect(body.details).toContain('Organization ID');
    });

    it('POST /api/projects creates and GET by orgId returns list', async () => {
      const orgListRes = await app.request(
        'http://localhost/api/organizations',
      );
      const orgs = (await orgListRes.json()) as Array<{ id: string }>;
      if (orgs.length === 0) {
        const createOrgRes = await app.request(
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
        expect(createOrgRes.status).toBe(201);
      }
      const listRes = await app.request('http://localhost/api/organizations');
      const orgList = (await listRes.json()) as Array<{ id: string }>;
      expect(orgList.length).toBeGreaterThanOrEqual(1);
      const orgId = orgList[0].id;

      const createRes = await app.request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Project',
          organizationId: orgId,
          createdBy: 'test',
        }),
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: string };
      expect(created.id).toBeDefined();

      const listRes2 = await app.request(
        `http://localhost/api/projects?orgId=${orgId}`,
      );
      expect(listRes2.status).toBe(200);
      const list = (await listRes2.json()) as Array<{ id: string }>;
      expect(list.some((p) => p.id === created.id)).toBe(true);
    });
  });

  describe('Projects bulk', () => {
    it('POST /api/projects/bulk with invalid body returns 400', async () => {
      const res = await app.request('http://localhost/api/projects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: number; details?: string };
      expect(body.code).toBe(400);
      expect(body.details).toContain('Invalid request body');
    });

    it('POST /api/projects/bulk delete removes projects', async () => {
      const orgListRes = await app.request(
        'http://localhost/api/organizations',
      );
      const orgList = (await orgListRes.json()) as Array<{ id: string }>;
      expect(orgList.length).toBeGreaterThanOrEqual(1);
      const orgId = orgList[0].id;

      const createRes = await app.request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bulk Delete Project',
          organizationId: orgId,
          createdBy: 'test',
        }),
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: string };

      const bulkRes = await app.request('http://localhost/api/projects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'delete', ids: [created.id] }),
      });
      expect(bulkRes.status).toBe(200);
      const bulkBody = (await bulkRes.json()) as {
        success: boolean;
        deletedCount: number;
      };
      expect(bulkBody.success).toBe(true);
      expect(bulkBody.deletedCount).toBe(1);

      const listRes = await app.request(
        `http://localhost/api/projects?orgId=${orgId}`,
      );
      const list = (await listRes.json()) as Array<{ id: string }>;
      expect(list.some((p) => p.id === created.id)).toBe(false);
    });
  });
});
