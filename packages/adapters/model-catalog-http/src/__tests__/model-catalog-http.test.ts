import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHttpModelCatalog } from '../index';

const fixtureDir = path.join(process.cwd(), '.test-model-catalog');
const cachePath = path.join(fixtureDir, 'models.json');

const originalFetch = globalThis.fetch;

interface FetchStub {
  calls: number;
  reset(): void;
  set(handler: (url: string) => Response | Promise<Response>): void;
}

function installFetchStub(): FetchStub {
  const stub = {
    calls: 0,
    handler: (_: string) => new Response('{}', { status: 200 }) as Response,
    reset() {
      this.calls = 0;
    },
    set(handler: (url: string) => Response | Promise<Response>) {
      this.handler = handler;
    },
  };
  // @ts-expect-error overriding global fetch for the test
  globalThis.fetch = async (input: RequestInfo | URL) => {
    stub.calls++;
    const url = input instanceof URL ? input.toString() : String(input);
    return stub.handler(url);
  };
  return stub as unknown as FetchStub & { handler: (u: string) => Response | Promise<Response> };
}

let fetchStub: ReturnType<typeof installFetchStub>;

beforeEach(() => {
  if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(fixtureDir, { recursive: true });
  fetchStub = installFetchStub();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

afterAll(() => {
  if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true });
});

const SAMPLE_CATALOG = {
  anthropic: {
    models: {
      'claude-opus': { cost: { input: 15, output: 75 } },
    },
  },
};

describe('HttpModelCatalog — fresh fetch', () => {
  test('fetches the catalog and caches it on disk', async () => {
    fetchStub.set(() => new Response(JSON.stringify(SAMPLE_CATALOG), { status: 200 }));
    const catalog = createHttpModelCatalog({ cachePath, url: 'https://example.test/api' });
    const r = await catalog.getCatalog();
    expect(r).toEqual(SAMPLE_CATALOG);
    expect(existsSync(cachePath)).toBe(true);
    expect(fetchStub.calls).toBe(1);
  });

  test('serves from in-process memo on repeat calls', async () => {
    fetchStub.set(() => new Response(JSON.stringify(SAMPLE_CATALOG), { status: 200 }));
    const catalog = createHttpModelCatalog({ cachePath, url: 'https://example.test/api' });
    await catalog.getCatalog();
    await catalog.getCatalog();
    expect(fetchStub.calls).toBe(1);
  });

  test('deduplicates concurrent callers (single inflight request)', async () => {
    let resolveFetch!: (r: Response) => void;
    fetchStub.set(
      () =>
        new Promise<Response>((r) => {
          resolveFetch = r;
        }),
    );
    const catalog = createHttpModelCatalog({ cachePath, url: 'https://example.test/api' });
    const a = catalog.getCatalog();
    const b = catalog.getCatalog();
    resolveFetch(new Response(JSON.stringify(SAMPLE_CATALOG), { status: 200 }));
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual(rb);
    expect(fetchStub.calls).toBe(1);
  });
});

describe('HttpModelCatalog — disk cache', () => {
  test('uses a fresh disk cache without re-fetching', async () => {
    const envelope = {
      fetchedAt: Date.now(),
      url: 'https://example.test/api',
      catalog: SAMPLE_CATALOG,
    };
    writeFileSync(cachePath, JSON.stringify(envelope));
    fetchStub.set(() => new Response('should not be called', { status: 500 }));
    const catalog = createHttpModelCatalog({ cachePath, url: 'https://example.test/api' });
    const r = await catalog.getCatalog();
    expect(r).toEqual(SAMPLE_CATALOG);
    expect(fetchStub.calls).toBe(0);
  });

  test('ignores stale disk cache and re-fetches', async () => {
    const stale = {
      fetchedAt: 0,
      url: 'https://example.test/api',
      catalog: { stale: true },
    };
    writeFileSync(cachePath, JSON.stringify(stale));
    fetchStub.set(() => new Response(JSON.stringify(SAMPLE_CATALOG), { status: 200 }));
    const catalog = createHttpModelCatalog({
      cachePath,
      url: 'https://example.test/api',
      ttlMs: 1000,
    });
    const r = await catalog.getCatalog();
    expect(r).toEqual(SAMPLE_CATALOG);
    expect(fetchStub.calls).toBe(1);
  });

  test('falls back to stale cache when fetch fails (offline)', async () => {
    const stale = {
      fetchedAt: 0,
      url: 'https://example.test/api',
      catalog: SAMPLE_CATALOG,
    };
    writeFileSync(cachePath, JSON.stringify(stale));
    fetchStub.set(() => {
      throw new Error('offline');
    });
    const catalog = createHttpModelCatalog({
      cachePath,
      url: 'https://example.test/api',
      ttlMs: 1000,
    });
    const r = await catalog.getCatalog();
    expect(r).toEqual(SAMPLE_CATALOG);
  });

  test('falls back to stale cache when server returns 500', async () => {
    const stale = {
      fetchedAt: 0,
      url: 'https://example.test/api',
      catalog: SAMPLE_CATALOG,
    };
    writeFileSync(cachePath, JSON.stringify(stale));
    fetchStub.set(() => new Response('boom', { status: 500 }));
    const catalog = createHttpModelCatalog({
      cachePath,
      url: 'https://example.test/api',
      ttlMs: 1000,
    });
    const r = await catalog.getCatalog();
    expect(r).toEqual(SAMPLE_CATALOG);
  });

  test('throws when fetch fails and no cache is available', async () => {
    fetchStub.set(() => {
      throw new Error('network down');
    });
    const catalog = createHttpModelCatalog({ cachePath, url: 'https://example.test/api' });
    await expect(catalog.getCatalog()).rejects.toThrow();
  });

  test('throws when server errors and no cache is available', async () => {
    fetchStub.set(() => new Response('boom', { status: 500, statusText: 'Server Error' }));
    const catalog = createHttpModelCatalog({ cachePath, url: 'https://example.test/api' });
    await expect(catalog.getCatalog()).rejects.toThrow(/500/);
  });

  test('ignores a corrupt disk cache and re-fetches', async () => {
    writeFileSync(cachePath, 'not json');
    fetchStub.set(() => new Response(JSON.stringify(SAMPLE_CATALOG), { status: 200 }));
    const catalog = createHttpModelCatalog({
      cachePath,
      url: 'https://example.test/api',
      ttlMs: 1000,
    });
    const r = await catalog.getCatalog();
    expect(r).toEqual(SAMPLE_CATALOG);
  });

  test('ignores a disk cache that was written against a different URL', async () => {
    const wrong = {
      fetchedAt: Date.now(),
      url: 'https://other-host/api',
      catalog: { other: true },
    };
    writeFileSync(cachePath, JSON.stringify(wrong));
    fetchStub.set(() => new Response(JSON.stringify(SAMPLE_CATALOG), { status: 200 }));
    const catalog = createHttpModelCatalog({ cachePath, url: 'https://example.test/api' });
    const r = await catalog.getCatalog();
    expect(r).toEqual(SAMPLE_CATALOG);
  });
});
