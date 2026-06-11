import { describe, expect, test } from 'bun:test';
import type { ConfigStore, ProviderConfig, UserConfig } from '@qwery/domain';
import { buildModel, buildProviderOptions, createAiSdkLLM, NoLLMProviderError } from '../index';

function fakeStore(active: ProviderConfig | null): ConfigStore {
  return {
    read: (): UserConfig => ({ providers: [] }) as UserConfig,
    write: () => undefined,
    setProviderConfig: () => ({ providers: [] }) as UserConfig,
    getActiveProvider: () => active,
  };
}

describe('buildModel', () => {
  test('Azure: rejects when required values are missing', () => {
    expect(() =>
      buildModel({ id: 'azure', values: { resourceName: '', apiKey: '', deployment: '' } } as ProviderConfig),
    ).toThrow(/missing required/);
  });

  test('Azure: builds a chat model with valid config', () => {
    const model = buildModel({
      id: 'azure',
      values: {
        resourceName: 'r',
        apiKey: 'k',
        deployment: 'gpt-4o',
        apiVersion: '2024-05-01',
        apiKind: 'chat',
      },
    } as ProviderConfig);
    expect(model).toBeDefined();
  });

  test('Azure: rejects an unknown apiKind', () => {
    expect(() =>
      buildModel({
        id: 'azure',
        values: { resourceName: 'r', apiKey: 'k', deployment: 'd', apiKind: 'gibberish' },
      } as unknown as ProviderConfig),
    ).toThrow(/apiKind must be/);
  });

  test('Bedrock: rejects when model is missing', () => {
    expect(() => buildModel({ id: 'bedrock', values: { model: '', apiKey: 'k' } } as ProviderConfig)).toThrow(
      /missing the required value/,
    );
  });

  test('Bedrock: rejects when no bearer token is available', () => {
    const prev = process.env.AWS_BEARER_TOKEN_BEDROCK;
    delete process.env.AWS_BEARER_TOKEN_BEDROCK;
    try {
      expect(() =>
        buildModel({
          id: 'bedrock',
          values: { model: 'anthropic.claude', apiKey: '' },
        } as ProviderConfig),
      ).toThrow(/bearer token/);
    } finally {
      if (prev !== undefined) process.env.AWS_BEARER_TOKEN_BEDROCK = prev;
    }
  });

  test('Bedrock: builds a model when token + model are provided', () => {
    const model = buildModel({
      id: 'bedrock',
      values: { model: 'anthropic.claude', apiKey: 'tok', region: 'us-east-1' },
    } as ProviderConfig);
    expect(model).toBeDefined();
  });

  test('Ollama-local: rejects when baseURL or model is missing', () => {
    expect(() =>
      buildModel({ id: 'ollama-local', values: { baseURL: '', model: '' } } as ProviderConfig),
    ).toThrow(/missing required/);
  });

  test('Ollama-local: builds a chat model with valid config', () => {
    const model = buildModel({
      id: 'ollama-local',
      values: { baseURL: 'http://localhost:11434', model: 'llama3' },
    } as ProviderConfig);
    expect(model).toBeDefined();
  });

  test('Ollama-cloud: builds a chat model with apiKey + baseURL', () => {
    const model = buildModel({
      id: 'ollama-cloud',
      values: { baseURL: 'https://ollama.cloud', model: 'llama3', apiKey: 'k' },
    } as ProviderConfig);
    expect(model).toBeDefined();
  });

  test('rejects unknown provider id', () => {
    expect(() => buildModel({ id: 'unknown-prov', values: {} } as unknown as ProviderConfig)).toThrow(
      /Unknown provider/,
    );
  });
});

describe('buildProviderOptions', () => {
  test('Azure responses GPT-5 defaults to high reasoning effort', () => {
    expect(
      buildProviderOptions({
        id: 'azure',
        values: { deployment: 'gpt-5.3-codex', apiKind: 'responses' },
      } as ProviderConfig),
    ).toEqual({ openai: { reasoningEffort: 'high' } });
  });

  test('Azure responses accepts explicit reasoning effort override', () => {
    expect(
      buildProviderOptions({
        id: 'azure',
        values: { deployment: 'gpt-5.3-codex', apiKind: 'responses', reasoningEffort: 'medium' },
      } as ProviderConfig),
    ).toEqual({ openai: { reasoningEffort: 'medium' } });
  });

  test('does not set reasoning effort for Azure chat models', () => {
    expect(
      buildProviderOptions({
        id: 'azure',
        values: { deployment: 'gpt-5.3-codex', apiKind: 'chat' },
      } as ProviderConfig),
    ).toBeUndefined();
  });
});

describe('createAiSdkLLM', () => {
  test('throws NoLLMProviderError when no active provider is configured', () => {
    const llm = createAiSdkLLM(fakeStore(null));
    expect(() => llm.getModel()).toThrow(NoLLMProviderError);
  });

  test('returns a model when an active provider exists', () => {
    const llm = createAiSdkLLM(
      fakeStore({
        id: 'ollama-local',
        values: { baseURL: 'http://localhost:11434', model: 'llama3' },
      } as ProviderConfig),
    );
    expect(llm.getModel()).toBeDefined();
  });

  test('returns provider options for the active provider', () => {
    const llm = createAiSdkLLM(
      fakeStore({
        id: 'azure',
        values: { deployment: 'gpt-5.3-codex', apiKind: 'responses', reasoningEffort: 'low' },
      } as ProviderConfig),
    );

    expect(llm.getProviderOptions?.()).toEqual({ openai: { reasoningEffort: 'low' } });
  });
});
