import { afterEach, describe, expect, test } from 'bun:test';
import { getProvider, PROVIDERS, type ProviderField, type ProviderSpec } from '../provider';

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

function modelField(id: ProviderSpec['id']): ProviderField {
  const field = getProvider(id).fields.find((f) => f.key === 'model');
  if (!field) throw new Error(`${id} has no model field`);
  return field;
}

function loadModels(id: ProviderSpec['id'], values: Record<string, string>): Promise<string[]> {
  const { loadChoices } = modelField(id);
  if (!loadChoices) throw new Error(`${id} model field cannot load choices`);
  return loadChoices(values);
}

describe('ollama-cloud loadChoices', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('model is a select field, not free text', () => {
    expect(modelField('ollama-cloud').type).toBe('select');
    expect(modelField('ollama-cloud').loadChoices).toBeDefined();
  });

  test('lists hosted models from /api/tags with the API key as a bearer token', async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    // @ts-expect-error global override for the test
    globalThis.fetch = async (url: string, init?: RequestInit) => {
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      return new Response(JSON.stringify({ models: [{ name: 'kimi-k2.6' }, { name: 'gpt-oss:120b' }] }), {
        status: 200,
      });
    };
    const names = await loadModels('ollama-cloud', { baseURL: 'https://ollama.com/v1', apiKey: 'sk-test' });
    expect(names).toEqual(['gpt-oss:120b', 'kimi-k2.6']);
    expect(calls).toEqual([
      { url: 'https://ollama.com/api/tags', headers: { Authorization: 'Bearer sk-test' } },
    ]);
  });

  test('falls back to the default base URL when none is set', async () => {
    let calledUrl = '';
    // @ts-expect-error global override
    globalThis.fetch = async (url: string) => {
      calledUrl = url;
      return new Response(JSON.stringify({ models: [{ name: 'glm-5.2' }] }), { status: 200 });
    };
    expect(await loadModels('ollama-cloud', { apiKey: 'sk-test' })).toEqual(['glm-5.2']);
    expect(calledUrl).toBe('https://ollama.com/api/tags');
  });

  test('throws when the service rejects the key', async () => {
    // @ts-expect-error global override
    globalThis.fetch = async () => new Response('unauthorized', { status: 401, statusText: 'Unauthorized' });
    await expect(
      loadModels('ollama-cloud', { baseURL: 'https://ollama.com/v1', apiKey: 'bad' }),
    ).rejects.toThrow(/401/);
  });

  test('empty list does not suggest `ollama pull`', async () => {
    // @ts-expect-error global override
    globalThis.fetch = async () => new Response(JSON.stringify({ models: [] }), { status: 200 });
    const err = await loadModels('ollama-cloud', {
      baseURL: 'https://ollama.com/v1',
      apiKey: 'sk-test',
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/No models available/);
    expect((err as Error).message).not.toMatch(/ollama pull/);
  });
});

describe('ollama-local loadChoices request', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('does not send an Authorization header', async () => {
    let headers: Record<string, string> = {};
    // @ts-expect-error global override
    globalThis.fetch = async (_url: string, init?: RequestInit) => {
      headers = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({ models: [{ name: 'llama3' }] }), { status: 200 });
    };
    await loadModels('ollama-local', { baseURL: 'http://localhost:11434/v1' });
    expect(headers).toEqual({});
  });
});
