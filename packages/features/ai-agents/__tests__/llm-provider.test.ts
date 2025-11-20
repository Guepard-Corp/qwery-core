/// <reference types="vitest/globals" />

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createChatModel } from '../src/llm-provider';
import { HumanMessage } from '@langchain/core/messages';

// Mock WebLLM
vi.mock('@mlc-ai/web-llm', () => {
  const mockEngine = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Hello from WebLLM',
              },
            },
          ],
        }),
      },
    },
    reload: vi.fn().mockResolvedValue(undefined),
    setInitProgressCallback: vi.fn(),
  };

  function MockMLCEngine(this: unknown) {
    return mockEngine;
  }

  return {
    MLCEngine: vi.fn(MockMLCEngine),
  };
});

function mockAzureResponses(responses: string[]) {
  let callIndex = 0;
  const fetchMock = vi.fn().mockImplementation(async () => {
    const content = responses[Math.min(callIndex, responses.length - 1)];
    callIndex += 1;
    return new Response(
      JSON.stringify({
        choices: [
          {
            index: callIndex - 1,
            message: {
              content,
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LLM Provider Abstraction', () => {
  const originalProcess = globalThis.process;

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof globalThis.process === 'undefined') {
      vi.stubGlobal('process', { env: {} });
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalProcess) {
      globalThis.process = originalProcess;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as Record<string, unknown>).process;
    }
  });

  describe('WebLLM Provider', () => {
    it('should create WebLLM chat model by default', () => {
      const model = createChatModel({
        provider: 'webllm',
        model: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
      });

      expect(model).toBeDefined();
      expect(model._llmType()).toBe('webllm');
    });

    it('should create WebLLM with custom model', () => {
      const model = createChatModel({
        provider: 'webllm',
        model: 'custom-model',
        temperature: 0.5,
      });

      expect(model).toBeDefined();
      expect(model._llmType()).toBe('webllm');
    });

    it('should invoke WebLLM and get response', async () => {
      const model = createChatModel({
        provider: 'webllm',
      });

      const response = await model.invoke([new HumanMessage('Hello')]);
      expect(response.content).toBe('Hello from WebLLM');
    });
  });

  describe('Azure Provider', () => {
    it('should create Azure chat model', () => {
      mockAzureResponses(['Hello from Azure']);

      const model = createChatModel({
        provider: 'azure',
        apiKey: 'test-key',
        endpoint: 'https://test.openai.azure.com',
        deployment: 'gpt-4o-mini',
      });

      expect(model).toBeDefined();
      expect(model._llmType()).toBe('ai-sdk');
    });

    it('should use environment variables when config not provided', () => {
      process.env.AZURE_API_KEY = 'env-key';
      process.env.AZURE_ENDPOINT = 'https://env.openai.azure.com';
      process.env.AZURE_DEPLOYMENT_ID = 'env-deployment';

      mockAzureResponses(['Hello']);

      const model = createChatModel({
        provider: 'azure',
      });

      expect(model).toBeDefined();

      // Cleanup
      delete process.env.AZURE_API_KEY;
      delete process.env.AZURE_ENDPOINT;
      delete process.env.AZURE_DEPLOYMENT_ID;
    });

    it('should invoke Azure and get response', async () => {
      mockAzureResponses(['Hello from Azure']);

      const model = createChatModel({
        provider: 'azure',
        apiKey: 'test-key',
        endpoint: 'https://test.openai.azure.com',
        deployment: 'gpt-4o-mini',
      });

      const response = await model.invoke([new HumanMessage('Hello')]);
      expect(response.content).toBe('Hello from Azure');
    });
  });

  describe('Provider Switching', () => {
    it('should switch between providers correctly', () => {
      mockAzureResponses(['Azure response']);

      const webllmModel = createChatModel({
        provider: 'webllm',
      });

      const azureModel = createChatModel({
        provider: 'azure',
        apiKey: 'test-key',
        endpoint: 'https://test.openai.azure.com',
        deployment: 'gpt-4o-mini',
      });

      expect(webllmModel._llmType()).toBe('webllm');
      expect(azureModel._llmType()).toBe('ai-sdk');
    });
  });
});

