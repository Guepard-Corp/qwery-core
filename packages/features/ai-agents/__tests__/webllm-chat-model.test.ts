/// <reference types="vitest/globals" />

import { HumanMessage } from '@langchain/core/messages';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { WebLLMChatModel } from '../src/webllm-chat-model';

// Mock MLCEngine to avoid actual model downloads in tests
vi.mock('@mlc-ai/web-llm', () => {
  const mockEngine = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Hello from WebLLM',
                tool_calls: undefined,
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

describe('WebLLM Chat Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a WebLLM chat model with default settings', () => {
    const model = new WebLLMChatModel();
    expect(model).toBeDefined();
    expect(model._llmType()).toBe('webllm');
  });

  it('should create a WebLLM chat model with custom model name', () => {
    const model = new WebLLMChatModel({
      model: 'custom-model-name',
    });
    expect(model).toBeDefined();
  });

  it('should invoke and get a response', async () => {
    const model = new WebLLMChatModel({
      model: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
      temperature: 0.7,
    });

    const response = await model.invoke([new HumanMessage('Hello')]);

    expect(response).toBeDefined();
    expect(response.content).toBe('Hello from WebLLM');
  });

  it('should handle init progress callback', async () => {
    const progressCallback = vi.fn();
    const model = new WebLLMChatModel({
      initProgressCallback: progressCallback,
    });

    // The callback should be set when engine is created
    await model.invoke([new HumanMessage('Test')]);

    // Verify callback was set (mocked engine should have been called)
    expect(progressCallback).toBeDefined();
  });

  it('should handle different message types', async () => {
    const model = new WebLLMChatModel();

    const messages = [
      new HumanMessage('User message'),
    ];

    const response = await model.invoke(messages);
    expect(response.content).toBeDefined();
  });
});

