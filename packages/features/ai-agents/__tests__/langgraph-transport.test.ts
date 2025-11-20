/// <reference types="vitest/globals" />

import { afterEach, vi } from 'vitest';
import { LangGraphTransport } from '../src/langgraph-transport';
import type { UIMessage } from 'ai';

const azureConfig = {
  provider: 'azure' as const,
  apiKey: 'test-key',
  endpoint: 'https://azure.test',
  deployment: 'mock-deployment',
  apiVersion: '2024-04-01-preview',
  temperature: 0.1,
};

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
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LangGraph Transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should send messages and stream LLM response', async () => {
    mockAzureResponses(['Hello from azure transport']);

    // Create transport with Azure provider injected for test stability
    const transport = new LangGraphTransport({
      llm: azureConfig,
      initProgressCallback: (progress) => {
        if (progress.progress < 1) {
          console.log(
            `Model loading: ${Math.round(progress.progress * 100)}% - ${progress.text}`,
          );
        } else {
          console.log('Model loading complete!');
        }
      },
    });

    // Create test messages
    const testMessages: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Say "Hello, this is a test"',
          },
        ],
      },
    ];

    // Send messages and get stream
    console.log('Sending messages through transport...');
    const stream = await transport.sendMessages({
      trigger: 'user',
      chatId: 'test-chat',
      messageId: 'test-msg',
      messages: testMessages,
      body: {},
    });

    expect(stream).toBeDefined();
    expect(stream instanceof ReadableStream).toBe(true);

    // Read from the stream
    const reader = stream.getReader();
    const chunks: UIMessageChunk[] = [];
    let done = false;

    console.log('Reading stream chunks...');
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        chunks.push(value);

        // Log chunk types for debugging
        if (value.type === 'text-delta') {
          console.log(`Text delta: ${value.delta || ''}`);
        }
      }
    }

    console.log(`\nReceived ${chunks.length} chunks`);

    // Validate we got expected chunk types
    const chunkTypes = chunks.map((c) => c.type);
    expect(chunkTypes).toContain('start');
    expect(chunkTypes).toContain('text-start');
    expect(chunkTypes).toContain('finish');

    // Validate we got text content
    const textDeltas = chunks
      .filter((c) => c.type === 'text-delta')
      .map((c) => c.delta)
      .join('');

    expect(textDeltas.length).toBeGreaterThan(0);
    expect(textDeltas.trim().length).toBeGreaterThan(0);

    // Validate finish chunk
    const finishChunk = chunks.find((c) => c.type === 'finish');
    expect(finishChunk).toBeDefined();
    expect(finishChunk.finishReason).toBe('stop');
  }, 600000); // 10 minutes timeout for model download and initialization on first run
});
