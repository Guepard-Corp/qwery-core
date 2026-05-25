import { afterEach, describe, expect, test } from 'bun:test';
import { getProvider, PROVIDERS, type ProviderSpec } from '../provider';

describe('PROVIDERS catalog', () => {
  test('contains every required provider', () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(ids).toContain('azure');
    expect(ids).toContain('bedrock');
    expect(ids).toContain('ollama-local');
    expect(ids).toContain('ollama-cloud');
  });

  test('every provider declares at least one required field', () => {
    for (const p of PROVIDERS) {
      expect(p.fields.length).toBeGreaterThan(0);
      expect(p.fields.some((f) => f.required)).toBe(true);
    }
  });
});

describe('getProvider', () => {
  test('returns the matching spec', () => {
    const r = getProvider('azure');
    expect(r.id).toBe('azure');
  });

  test('throws for unknown id', () => {
    // @ts-expect-error testing the unknown-id branch at runtime
    expect(() => getProvider('does-not-exist')).toThrow(/Unknown provider/);
  });
});

describe('ollama-local loadChoices', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('lists model names from /api/tags', async () => {
    // @ts-expect-error global override for the test
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ models: [{ name: 'llama3' }, { name: 'qwen2.5-coder' }] }), {
        status: 200,
      });
    const ollama = PROVIDERS.find((p) => p.id === 'ollama-local') as ProviderSpec;
    const modelField = ollama.fields.find((f) => f.key === 'model')!;
    const names = await modelField.loadChoices!({ baseURL: 'http://localhost:11434/v1' });
    expect(names).toEqual(['llama3', 'qwen2.5-coder']);
  });

  test('throws when the daemon returns non-OK', async () => {
    // @ts-expect-error global override
    globalThis.fetch = async () => new Response('boom', { status: 503, statusText: 'down' });
    const ollama = PROVIDERS.find((p) => p.id === 'ollama-local') as ProviderSpec;
    const modelField = ollama.fields.find((f) => f.key === 'model')!;
    await expect(modelField.loadChoices!({ baseURL: 'http://localhost:11434/v1' })).rejects.toThrow(/503/);
  });

  test('throws when no model is installed', async () => {
    // @ts-expect-error global override
    globalThis.fetch = async () => new Response(JSON.stringify({ models: [] }), { status: 200 });
    const ollama = PROVIDERS.find((p) => p.id === 'ollama-local') as ProviderSpec;
    const modelField = ollama.fields.find((f) => f.key === 'model')!;
    await expect(modelField.loadChoices!({ baseURL: 'http://localhost:11434/v1' })).rejects.toThrow(
      /No models installed/,
    );
  });
});
