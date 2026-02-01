import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConversation } from '../src/server-client.ts';

describe('createConversation', () => {
  const _originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, _init?: RequestInit) =>
        Promise.resolve(new Response('', { status: 200 })),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns slug when server returns valid JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ slug: 'conv-abc-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await createConversation(
      'http://localhost:4096',
      'Test',
      'hello',
    );
    expect(result).toEqual({ slug: 'conv-abc-123' });
  });

  it('throws helpful error when server returns HTML instead of JSON', async () => {
    const html = `<!DOCTYPE html><html><head><title>404</title></head><body>Not Found</body></html>`;
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    await expect(
      createConversation('http://localhost:3000', 'Test', 'hello'),
    ).rejects.toThrow(/Server returned HTML instead of JSON/i);
  });

  it('throws helpful error when response body looks like HTML (starts with <)', async () => {
    const html = '<html>Error page</html>';
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: {}, // no Content-Type
      }),
    );

    await expect(
      createConversation('http://localhost:3000', 'Test', 'hello'),
    ).rejects.toThrow(/Server returned HTML instead of JSON/i);
  });

  it('throws invalid JSON error when body is malformed (not HTML)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{ invalid json }', {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    );

    await expect(
      createConversation('http://localhost:4096', 'Test', 'hello'),
    ).rejects.toThrow(/Server returned invalid JSON/i);
  });

  it('throws on non-ok response with error body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    await expect(
      createConversation('http://localhost:4096', 'Test', 'hello'),
    ).rejects.toThrow(/Failed to create conversation/i);
  });
});
