import { describe, expect, test } from 'bun:test';
import type { Compute, LLMProvider, Logger } from '@qwery/domain';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { runAgent } from '../agent-loop';

/** Build a fake LLMProvider that returns a MockLanguageModelV3 instance. */
function fakeLLM(model: MockLanguageModelV3): LLMProvider {
  return {
    getModel() {
      return model as unknown as ReturnType<LLMProvider['getModel']>;
    },
  };
}

const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const computeStub: Compute = {
  runSql: async () => ({ columns: [], rows: [], rowCount: 0, durationMs: 0 }),
  describeSql: async () => ({ columns: [] }),
};

// The Vercel mock model expects `LanguageModelV3StreamPart` chunks. We don't
// pull the provider types in here just to satisfy the compiler — the shapes
// we feed are valid at runtime so we cast on the way in.
function streamChunks(parts: Array<Record<string, unknown>>, delay = 5) {
  return simulateReadableStream({
    chunks: parts,
    initialDelayInMs: 0,
    chunkDelayInMs: delay,
  }) as unknown as ReadableStream<never>;
}

describe('runAgent abort signal', () => {
  test('returns finishReason="aborted" with partial text when signal fires mid-stream', async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: streamChunks(
          [
            { type: 'stream-start', warnings: [] },
            { type: 'text-start', id: 't1' },
            { type: 'text-delta', id: 't1', delta: 'hello ' },
            { type: 'text-delta', id: 't1', delta: 'world ' },
            { type: 'text-delta', id: 't1', delta: 'more text' },
            { type: 'text-end', id: 't1' },
            {
              type: 'finish',
              finishReason: 'stop',
              usage: { inputTokens: 1, outputTokens: 3, totalTokens: 4 },
            },
          ],
          15,
        ),
      }),
    });

    const ac = new AbortController();
    let received = '';
    // Abort after a short delay — partway through the stream.
    setTimeout(() => ac.abort(), 25);

    const result = await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      compute: computeStub,
      llm: fakeLLM(model),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: (d) => {
        received += d;
      },
      signal: ac.signal,
      disableCompaction: true,
    });

    expect(result.finishReason).toBe('aborted');
    // Either some delta arrived before the abort (received non-empty) OR none
    // did (received empty + result.text empty). Both are valid outcomes; the
    // invariant is that result.text matches what we observed via onToken.
    expect(result.text).toBe(received);
  });

  test('abort before stream starts still resolves with finishReason="aborted"', async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: streamChunks(
          [
            { type: 'stream-start', warnings: [] },
            { type: 'text-start', id: 't1' },
            { type: 'text-delta', id: 't1', delta: 'too late' },
            { type: 'text-end', id: 't1' },
            {
              type: 'finish',
              finishReason: 'stop',
              usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            },
          ],
          5,
        ),
      }),
    });

    const ac = new AbortController();
    ac.abort();
    const result = await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      compute: computeStub,
      llm: fakeLLM(model),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      signal: ac.signal,
      disableCompaction: true,
    });
    expect(result.finishReason).toBe('aborted');
  });

  test('normal completion has finishReason !== "aborted"', async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: streamChunks([
          { type: 'stream-start', warnings: [] },
          { type: 'text-start', id: 't1' },
          { type: 'text-delta', id: 't1', delta: 'done' },
          { type: 'text-end', id: 't1' },
          {
            type: 'finish',
            finishReason: 'stop',
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          },
        ]),
      }),
    });
    const result = await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      compute: computeStub,
      llm: fakeLLM(model),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      disableCompaction: true,
    });
    expect(result.finishReason).not.toBe('aborted');
    expect(result.text).toBe('done');
  });
});
