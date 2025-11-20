/// <reference types="vitest/globals" />

import { HumanMessage } from '@langchain/core/messages';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { createChatModel } from '../src/llm-provider';

describe('Azure provider via AI SDK', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends messages to the Azure endpoint and parses tool calls', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              index: 0,
              message: {
                content: 'hello from azure',
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'function',
                    function: {
                      name: 'lookupFoo',
                      arguments: '{"foo":"bar"}',
                    },
                  },
                ],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });

    vi.stubGlobal('fetch', mockFetch);

    const model = createChatModel({
      provider: 'azure',
      apiKey: 'secret',
      endpoint: 'https://example-resource.openai.azure.com',
      deployment: 'gpt-5-mini',
      apiVersion: '2024-04-01-preview',
      temperature: 0.2,
    });

    const response = await model.invoke([new HumanMessage('ping')]);

    expect(mockFetch).toHaveBeenCalled();
    const [, requestInit] = mockFetch.mock.lastCall ?? [];
    expect(requestInit).toBeDefined();
    expect(requestInit?.headers).toMatchObject({
      'api-key': 'secret',
    });

    expect(response.content).toBe('hello from azure');
  });
});

