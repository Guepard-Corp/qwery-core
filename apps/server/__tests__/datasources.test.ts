import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { Hono } from 'hono';

vi.mock('dssrf', () => ({
  is_url_safe: vi.fn().mockResolvedValue(true),
}));

import { createTestApp, cleanupTestDir } from './helpers/setup';
import { resetRateLimitStateForTests } from '../src/lib/rate-limit';

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
    beforeEach(() => {
      resetRateLimitStateForTests();
      vi.restoreAllMocks();
    });

    it('GET /api/datasources without projectId returns 400', async () => {
      const res = await app.request('http://localhost/api/datasources');
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('projectId');
    });

    it('POST /api/datasources/proxy-json blocks localhost URL', async () => {
      const res = await app.request(
        'http://localhost/api/datasources/proxy-json',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: 'http://localhost:1234/data.json' }),
        },
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toMatch(/localhost|blocked|policy|not allowed/i);
    });

    it('POST /api/datasources/proxy-json returns parsed JSON', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const res = await app.request(
        'http://localhost/api/datasources/proxy-json',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: 'https://example.com/data.json' }),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data?: unknown };
      expect(body.data).toEqual({ ok: true });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('POST /api/datasources/proxy-json rejects non-JSON responses', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('not json', { status: 200 }),
      );

      const res = await app.request(
        'http://localhost/api/datasources/proxy-json',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: 'https://example.com/not-json' }),
        },
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toMatch(/valid json/i);
    });

    it('POST /api/datasources/proxy-json rate limits at 30/min', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      let lastStatus = 0;
      for (let i = 0; i < 31; i += 1) {
        const res = await app.request(
          'http://localhost/api/datasources/proxy-json',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '1.2.3.4',
            },
            body: JSON.stringify({ url: 'https://example.com/data.json' }),
          },
        );
        lastStatus = res.status;
      }
      expect(lastStatus).toBe(429);
    }, 20_000);

    it('POST /api/datasources/validate-url rate limits at 30/min', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ hello: 'world' }), { status: 200 }),
      );

      let last: { status: number; body: unknown } | null = null;
      for (let i = 0; i < 31; i += 1) {
        const res = await app.request(
          'http://localhost/api/datasources/validate-url',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '1.2.3.4',
            },
            body: JSON.stringify({
              url: 'https://example.com/data.json',
              expectedFormat: 'json',
            }),
          },
        );
        last = { status: res.status, body: await res.json() };
      }
      expect(last?.status).toBe(429);
      expect(last?.body).toEqual({ valid: false, error: 'Too many requests' });
    }, 20_000);
  });
});
