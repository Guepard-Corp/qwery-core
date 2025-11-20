/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LangGraphTransport } from '../src/langgraph-transport';
import { createLangGraphAgent } from '../src/langgraph-agent';
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

  return {
    MLCEngine: vi.fn().mockImplementation(() => mockEngine),
  };
});

// Mock Azure fetch
function mockAzureResponse(content: string) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            index: 0,
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
    ),
  );

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LLM Provider Abstraction (Web App Context)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('WebLLM Provider (Browser)', () => {
    it('should create agent with WebLLM provider via abstraction', () => {
      const { app, llm } = createLangGraphAgent({
        llm: {
          provider: 'webllm',
          model: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
          temperature: 0.1,
        },
      });

      expect(app).toBeDefined();
      expect(llm).toBeDefined();
      expect(llm._llmType()).toBe('webllm');
    });

    it('should use WebLLM as default when no provider specified', () => {
      const { llm } = createLangGraphAgent({
        model: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
      });

      expect(llm).toBeDefined();
      expect(llm._llmType()).toBe('webllm');
    });

    it('should create LangGraphTransport with WebLLM', () => {
      const transport = new LangGraphTransport({
        llm: {
          provider: 'webllm',
          model: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
        },
      });

      expect(transport).toBeDefined();
      expect(typeof transport.sendMessages).toBe('function');
    });
  });

  describe('Azure Provider (Browser)', () => {
    it('should create agent with Azure provider via abstraction', () => {
      mockAzureResponse('Hello from Azure');

      const { app, llm } = createLangGraphAgent({
        llm: {
          provider: 'azure',
          apiKey: 'test-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o-mini',
          apiVersion: '2024-04-01-preview',
        },
      });

      expect(app).toBeDefined();
      expect(llm).toBeDefined();
      expect(llm._llmType()).toBe('ai-sdk');
    });

    it('should create LangGraphTransport with Azure', () => {
      mockAzureResponse('Hello from Azure');

      const transport = new LangGraphTransport({
        llm: {
          provider: 'azure',
          apiKey: 'test-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o-mini',
        },
      });

      expect(transport).toBeDefined();
      expect(typeof transport.sendMessages).toBe('function');
    });

    it('should invoke Azure agent and get response', async () => {
      mockAzureResponse('Azure response to test message');

      const { app } = createLangGraphAgent({
        llm: {
          provider: 'azure',
          apiKey: 'test-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o-mini',
        },
      });

      const result = await app.invoke({
        messages: [new HumanMessage('test')],
      });

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });

  describe('Provider Switching in Web App', () => {
    it('should switch between WebLLM and Azure seamlessly', () => {
      mockAzureResponse('Azure response');

      const webllmAgent = createLangGraphAgent({
        llm: {
          provider: 'webllm',
          model: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
        },
      });

      const azureAgent = createLangGraphAgent({
        llm: {
          provider: 'azure',
          apiKey: 'test-key',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o-mini',
        },
      });

      expect(webllmAgent.llm._llmType()).toBe('webllm');
      expect(azureAgent.llm._llmType()).toBe('ai-sdk');
    });

    it('should use same abstraction interface for both providers', () => {
      mockAzureResponse('test');

      const webllmAgent = createLangGraphAgent({
        llm: { provider: 'webllm' },
      });

      const azureAgent = createLangGraphAgent({
        llm: {
          provider: 'azure',
          apiKey: 'test',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o-mini',
        },
      });

      // Both should have the same interface
      expect(typeof webllmAgent.llm.invoke).toBe('function');
      expect(typeof azureAgent.llm.invoke).toBe('function');
      expect(typeof webllmAgent.app.invoke).toBe('function');
      expect(typeof azureAgent.app.invoke).toBe('function');
    });

    it('should work with LangGraphTransport for both providers', () => {
      mockAzureResponse('test');

      const webllmTransport = new LangGraphTransport({
        llm: { provider: 'webllm' },
      });

      const azureTransport = new LangGraphTransport({
        llm: {
          provider: 'azure',
          apiKey: 'test',
          endpoint: 'https://test.openai.azure.com',
          deployment: 'gpt-4o-mini',
        },
      });

      expect(webllmTransport).toBeDefined();
      expect(azureTransport).toBeDefined();
      expect(typeof webllmTransport.sendMessages).toBe('function');
      expect(typeof azureTransport.sendMessages).toBe('function');
    });
  });

  describe('Abstraction Consistency', () => {
    it('should use createChatModel for all providers', () => {
      mockAzureResponse('test');

      // Both providers go through the same abstraction
      const webllmConfig = { provider: 'webllm' as const };
      const azureConfig = {
        provider: 'azure' as const,
        apiKey: 'test',
        endpoint: 'https://test.openai.azure.com',
        deployment: 'gpt-4o-mini',
      };

      const webllmAgent = createLangGraphAgent({ llm: webllmConfig });
      const azureAgent = createLangGraphAgent({ llm: azureConfig });

      // Both use the same abstraction layer
      expect(webllmAgent.llm).toBeDefined();
      expect(azureAgent.llm).toBeDefined();
      // Both are BaseChatModel instances
      expect(typeof webllmAgent.llm.invoke).toBe('function');
      expect(typeof azureAgent.llm.invoke).toBe('function');
    });
  });
});

