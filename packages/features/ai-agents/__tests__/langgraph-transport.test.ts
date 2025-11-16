/// <reference types="vitest/globals" />

import { LangGraphTransport } from '../src/langgraph-transport';
import type { UIMessage } from 'ai';

describe('LangGraph Transport', () => {
  it('should send messages and stream LLM response', async () => {
    // Create transport with the lightest model for faster test execution
    const transport = new LangGraphTransport({
      model: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k',
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
