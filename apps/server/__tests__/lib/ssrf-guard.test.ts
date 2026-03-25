import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dssrf', () => ({
  is_url_safe: vi.fn(),
}));

import { is_url_safe } from 'dssrf';
import {
  assertSafePublicUrl,
  fetchWithSsrfProtection,
  SsrfBlockedError,
} from '../../src/lib/ssrf-guard';

const mockedIsUrlSafe = vi.mocked(is_url_safe);

describe('ssrf-guard', () => {
  beforeEach(() => {
    mockedIsUrlSafe.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks localhost URLs', async () => {
    await expect(
      assertSafePublicUrl('http://localhost:8080/x'),
    ).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks URLs rejected by dssrf policy', async () => {
    mockedIsUrlSafe.mockResolvedValueOnce(false);

    await expect(
      assertSafePublicUrl('https://example.com/data.json'),
    ).rejects.toThrow(/blocked by SSRF policy/);
  });

  it('allows URLs accepted by dssrf policy', async () => {
    mockedIsUrlSafe.mockResolvedValueOnce(true);

    const parsed = await assertSafePublicUrl('https://example.com/data.json');
    expect(parsed.hostname).toBe('example.com');
  });

  it('validates redirect targets with dssrf (not only localhost shape check)', async () => {
    mockedIsUrlSafe.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://10.0.0.1/next' },
      }),
    );

    await expect(
      fetchWithSsrfProtection('https://example.com'),
    ).rejects.toThrow(/blocked by SSRF policy/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks non-http(s) protocols', async () => {
    await expect(assertSafePublicUrl('ftp://example.com/file')).rejects.toThrow(
      /http or https/,
    );
    await expect(assertSafePublicUrl('file:///etc/passwd')).rejects.toThrow(
      /http or https/,
    );
    await expect(assertSafePublicUrl('data:text/plain,hello')).rejects.toThrow(
      /http or https/,
    );
  });

  it('blocks URLs with embedded credentials', async () => {
    await expect(
      assertSafePublicUrl('https://user:secret@example.com/x'),
    ).rejects.toThrow(/credentials are not allowed/);
  });

  it('stops after max redirects', async () => {
    mockedIsUrlSafe.mockResolvedValue(true);
    let step = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      step += 1;
      return Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: `https://example.com/r${step}` },
        }),
      );
    });

    await expect(
      fetchWithSsrfProtection('https://example.com'),
    ).rejects.toThrow(/Too many redirects/);
  });

  it('follows multiple redirects when all targets are safe', async () => {
    mockedIsUrlSafe.mockResolvedValue(true);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'https://example.com/r1' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: '/r2' },
        }),
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const res = await fetchWithSsrfProtection('https://example.com/start');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
