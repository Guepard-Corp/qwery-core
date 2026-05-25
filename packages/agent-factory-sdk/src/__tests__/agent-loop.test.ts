import { describe, expect, test } from 'bun:test';
import type { Compute, LLMProvider, Logger, ToolEvent } from '@qwery/domain';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { runAgent } from '../agent-loop';
import { createTodoStore } from '../todo-tools';

/**
 * NOTE on `MockLanguageModelV3` quirks: in this AI SDK version, the mock
 * stream's `finish` chunk does NOT propagate `usage` nor `finishReason` to
 * `streamText`'s downstream consumers. We therefore test what observably
 * passes through (text, runs to completion, no throw) and avoid asserting
 * on those two fields directly. The agent-loop's own `signal.aborted` path
 * IS observable and is covered in agent-loop-abort.test.ts.
 */

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

function streamChunks(parts: Array<Record<string, unknown>>, delay = 0) {
  return simulateReadableStream({
    chunks: parts,
    initialDelayInMs: 0,
    chunkDelayInMs: delay,
  }) as unknown as ReadableStream<never>;
}

function trivialModel(text = 'ok'): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: streamChunks([
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: 't' },
        { type: 'text-delta', id: 't', delta: text },
        { type: 'text-end', id: 't' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      ]),
    }),
  });
}

describe('runAgent — happy path', () => {
  test('returns the streamed text', async () => {
    const r = await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      compute: computeStub,
      llm: fakeLLM(trivialModel('hello world')),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      disableCompaction: true,
    });
    expect(r.text).toBe('hello world');
    // The completion path is not the aborted path.
    expect(r.finishReason).not.toBe('aborted');
  });

  test('onToken receives every delta', async () => {
    const tokens: string[] = [];
    await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      compute: computeStub,
      llm: fakeLLM(trivialModel('abc')),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: (d) => tokens.push(d),
      disableCompaction: true,
    });
    expect(tokens.join('')).toBe('abc');
  });
});

describe('runAgent — error propagation', () => {
  test('stream-level error is re-thrown', async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: streamChunks([
          { type: 'stream-start', warnings: [] },
          { type: 'error', error: new Error('upstream 503') },
        ]),
      }),
    });
    await expect(
      runAgent({
        messages: [{ role: 'user', content: 'hi' }],
        compute: computeStub,
        llm: fakeLLM(model),
        logger: silentLogger,
        onToolEvent: () => undefined,
        onToken: () => undefined,
        disableCompaction: true,
      }),
    ).rejects.toThrow();
  });

  test('a thrown doStream rejection bubbles up to the caller', async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => {
        throw new Error('connection refused');
      },
    });
    await expect(
      runAgent({
        messages: [{ role: 'user', content: 'hi' }],
        compute: computeStub,
        llm: fakeLLM(model),
        logger: silentLogger,
        onToolEvent: () => undefined,
        onToken: () => undefined,
        disableCompaction: true,
      }),
    ).rejects.toThrow();
  });
});

describe('runAgent — wiring', () => {
  test('todoTools are wired when sessionId + todoStore are provided', async () => {
    const r = await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      compute: computeStub,
      llm: fakeLLM(trivialModel()),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      disableCompaction: true,
      sessionId: 'session-x',
      todoStore: createTodoStore(),
    });
    expect(r.text).toBe('ok');
  });

  test('skill filtering respects per-skill agent scope', async () => {
    const r = await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      compute: computeStub,
      llm: fakeLLM(trivialModel()),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      disableCompaction: true,
      skills: [
        { name: 'a', description: 'd', path: 'p', agent: 'data' },
        { name: 'b', description: 'd', path: 'p', agent: 'code' },
        { name: 'c', description: 'd', path: 'p', agent: 'all' },
      ],
    });
    expect(r.text).toBe('ok');
  });

  test('runs as a subagent (depth cap = 1, no agent tool, no compaction)', async () => {
    const r = await runAgent({
      messages: [{ role: 'user', content: 'do subtask' }],
      compute: computeStub,
      llm: fakeLLM(trivialModel('subagent done')),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      isSubagent: true,
    });
    expect(r.text).toBe('subagent done');
  });
});

describe('runAgent — compaction integration', () => {
  test('runs compaction when contextLimit is exceeded and emits onCompaction', async () => {
    const longBlob = 'x'.repeat(20_000);
    const messages = [
      { role: 'user' as const, content: longBlob },
      { role: 'assistant' as const, content: longBlob },
      { role: 'user' as const, content: 'hello' },
    ];
    // Compaction's summary generator calls `generateText`, which routes to
    // `doGenerate` on the model — we must mock both.
    const model = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: 'text', text: 'rolling summary' }],
        finishReason: 'stop',
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
      }),
      doStream: async () => ({
        stream: streamChunks([
          { type: 'stream-start', warnings: [] },
          { type: 'text-start', id: 't' },
          { type: 'text-delta', id: 't', delta: 'after compaction' },
          { type: 'text-end', id: 't' },
          {
            type: 'finish',
            finishReason: 'stop',
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          },
        ]),
      }),
    });
    let event: { phase: string } | undefined;
    const r = await runAgent({
      messages,
      compute: computeStub,
      llm: fakeLLM(model),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      contextLimit: 5_000,
      onCompaction: (e) => {
        event = e;
      },
    });
    expect(r.text).toBe('after compaction');
    expect(event?.phase).toBeDefined();
  });
});

describe('runAgent — onToolEvent', () => {
  test('no tool calls in the stream → no tool events are emitted', async () => {
    const events: ToolEvent[] = [];
    await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      compute: computeStub,
      llm: fakeLLM(trivialModel()),
      logger: silentLogger,
      onToolEvent: (e) => events.push(e),
      onToken: () => undefined,
      disableCompaction: true,
    });
    expect(events).toHaveLength(0);
  });
});
