import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

describe('Server API – init', () => {
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

  describe('POST /api/init', () => {
    it('returns workspace with anonymous user and default org/project when no body', async () => {
      const res = await app.request('http://localhost/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        user: { id: string; username: string };
        organization?: { id: string; name: string };
        project?: { id: string; name: string };
        isAnonymous: boolean;
        runtime: string;
      };
      expect(body.user).toBeDefined();
      expect(body.user.username).toBe('anonymous');
      expect(body.isAnonymous).toBe(true);
      expect(body.organization).toBeDefined();
      expect(body.organization?.name).toBe('Default Organization');
      expect(body.project).toBeDefined();
      expect(body.project?.name).toBe('Default Project');
      expect(body.runtime).toBe('browser');
    });

    it('returns workspace with userId when provided and user exists', async () => {
      const createUserRes = await app.request(
        'http://localhost/api/organizations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Init Test Org',
            userId: '00000000-0000-0000-0000-000000000001',
            createdBy: 'test',
          }),
        },
      );
      expect(createUserRes.status).toBe(201);
      const org = (await createUserRes.json()) as { id: string };

      const initRes = await app.request('http://localhost/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '',
          organizationId: org.id,
        }),
      });
      expect(initRes.status).toBe(200);
      const body = (await initRes.json()) as {
        organization?: { id: string; name: string };
      };
      expect(body.organization?.id).toBe(org.id);
      expect(body.organization?.name).toBe('Init Test Org');
    });

    it('accepts runtime in request body', async () => {
      const res = await app.request('http://localhost/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtime: 'desktop' }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { runtime: string };
      expect(body.runtime).toBe('desktop');
    });
  });
});
