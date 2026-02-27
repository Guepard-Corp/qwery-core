import { describe, expect, it, vi, afterEach } from 'vitest';
import { ApiError, apiGet } from '~/lib/repositories/api-client';
import { getLogger } from '@qwery/shared/logger';

vi.mock('@qwery/shared/logger', () => {
  const warn = vi.fn();
  return {
    getLogger: vi.fn(async () => ({
      warn,
    })),
  };
});

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('api-client malformed error body logging', () => {
  it('logs when error body JSON parsing fails', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response('not-json', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const { warn } = (await getLogger()) as unknown as {
      warn: ReturnType<typeof vi.fn>;
    };

    await expect(apiGet('/test')).rejects.toBeInstanceOf(ApiError);

    expect(warn).toHaveBeenCalledWith(
      {
        status: 500,
        body: null,
      },
      'Api client: malformed error body',
    );
  });

  it('logs when error body JSON has no numeric code', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ code: 'not-a-number' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const { warn } = (await getLogger()) as unknown as {
      warn: ReturnType<typeof vi.fn>;
    };

    await expect(apiGet('/test')).rejects.toBeInstanceOf(ApiError);

    expect(warn).toHaveBeenCalledWith(
      {
        status: 500,
        body: { code: 'not-a-number' },
      },
      'Api client: malformed error body',
    );
  });
});
