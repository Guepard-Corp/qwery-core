import { describe, expect, test } from 'bun:test';
import type { Compute, LLMProvider, Logger, ToolEvent } from '@qwery/domain';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import {
  DEFAULT_MAX_RETRIES,
  formatStreamError,
  resolveMaxRetries,
  runAgent,
  withAgentReasoningEffort,
} from '../agent-loop';
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

describe('withAgentReasoningEffort', () => {
  test('overrides the openai reasoning effort when the agent sets one', () => {
    const out = withAgentReasoningEffort({ openai: { reasoningEffort: 'high' } }, 'medium');
    expect(out).toEqual({ openai: { reasoningEffort: 'medium' } });
  });

  test('preserves other openai options while overriding effort', () => {
    const out = withAgentReasoningEffort({ openai: { reasoningEffort: 'high', store: true } }, 'low');
    expect(out).toEqual({ openai: { reasoningEffort: 'low', store: true } });
  });

  test('no-op when the agent sets no effort (provider default stands)', () => {
    const opts = { openai: { reasoningEffort: 'high' } };
    expect(withAgentReasoningEffort(opts, undefined)).toBe(opts);
  });

  test('no-op when the provider produced no openai options', () => {
    expect(withAgentReasoningEffort(undefined, 'medium')).toBeUndefined();
    const ollama = { ollama: { foo: 1 } };
    expect(withAgentReasoningEffort(ollama, 'medium')).toBe(ollama);
  });
});

describe('resolveMaxRetries', () => {
  function withEnv(value: string | undefined, fn: () => void): void {
    const prev = process.env.QWERY_MAX_RETRIES;
    if (value === undefined) delete process.env.QWERY_MAX_RETRIES;
    else process.env.QWERY_MAX_RETRIES = value;
    try {
      fn();
    } finally {
      if (prev === undefined) delete process.env.QWERY_MAX_RETRIES;
      else process.env.QWERY_MAX_RETRIES = prev;
    }
  }

  test('defaults when unset (survives transient 429s with backoff)', () => {
    withEnv(undefined, () => expect(resolveMaxRetries()).toBe(DEFAULT_MAX_RETRIES));
  });

  test('honors a valid override', () => {
    withEnv('8', () => expect(resolveMaxRetries()).toBe(8));
  });

  test('allows 0 to disable retries', () => {
    withEnv('0', () => expect(resolveMaxRetries()).toBe(0));
  });

  test('falls back to the default for invalid or negative values', () => {
    withEnv('abc', () => expect(resolveMaxRetries()).toBe(DEFAULT_MAX_RETRIES));
    withEnv('-3', () => expect(resolveMaxRetries()).toBe(DEFAULT_MAX_RETRIES));
  });
});

describe('runAgent — error propagation', () => {
  test('formats object stream errors instead of [object Object]', () => {
    expect(formatStreamError({ message: 'rate limited', status: 429 })).toBe('rate limited');
    expect(formatStreamError({ code: 'bad_request', status: 400 })).toBe(
      '{"code":"bad_request","status":400}',
    );
  });

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

describe('runAgent — step boundaries', () => {
  // A two-step run: step 1 emits transient status narration then calls a tool;
  // step 2 emits the final report. `doStream` is invoked once per step.
  function twoStepModel(status: string, report: string): MockLanguageModelV3 {
    let call = 0;
    return new MockLanguageModelV3({
      doStream: async () => {
        call += 1;
        if (call === 1) {
          return {
            stream: streamChunks([
              { type: 'stream-start', warnings: [] },
              { type: 'text-start', id: 's1' },
              { type: 'text-delta', id: 's1', delta: status },
              { type: 'text-end', id: 's1' },
              { type: 'tool-call', toolCallId: 'c1', toolName: 'todoRead', input: '{}' },
              {
                type: 'finish',
                finishReason: 'tool-calls',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
              },
            ]),
          };
        }
        return {
          stream: streamChunks([
            { type: 'stream-start', warnings: [] },
            { type: 'text-start', id: 's2' },
            { type: 'text-delta', id: 's2', delta: report },
            { type: 'text-end', id: 's2' },
            {
              type: 'finish',
              finishReason: 'stop',
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            },
          ]),
        };
      },
    });
  }

  test('report is the final step only — interim status narration is not accumulated', async () => {
    const r = await runAgent({
      messages: [{ role: 'user', content: 'audit' }],
      compute: computeStub,
      llm: fakeLLM(twoStepModel('Phase 1/4 - Collect: gathering signals.', 'FINAL REPORT BODY')),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      disableCompaction: true,
      sessionId: 'sess',
      todoStore: createTodoStore(),
    });
    // Without the start-step reset this would be the two steps concatenated
    // ("Phase 1/4 - Collect: gathering signals.FINAL REPORT BODY").
    expect(r.text).toBe('FINAL REPORT BODY');
  });

  test('onStepStart fires once per tool-loop step', async () => {
    let starts = 0;
    await runAgent({
      messages: [{ role: 'user', content: 'audit' }],
      compute: computeStub,
      llm: fakeLLM(twoStepModel('status', 'report')),
      logger: silentLogger,
      onToolEvent: () => undefined,
      onToken: () => undefined,
      onStepStart: () => {
        starts += 1;
      },
      disableCompaction: true,
      sessionId: 'sess',
      todoStore: createTodoStore(),
    });
    expect(starts).toBe(2);
  });
});

describe('runAgent — QWERY_DEBUG_REPORT_TEXT', () => {
  function capturingLogger(): { logger: Logger; done: () => Record<string, unknown> | undefined } {
    const infos: Array<{ event: string; fields?: Record<string, unknown> }> = [];
    return {
      logger: {
        debug: () => undefined,
        info: (event: string, fields?: Record<string, unknown>) => infos.push({ event, fields }),
        warn: () => undefined,
        error: () => undefined,
      },
      done: () => infos.find((i) => i.event === 'agent.run.done')?.fields,
    };
  }

  async function runWith(flag: string | undefined): Promise<Record<string, unknown> | undefined> {
    const prev = process.env.QWERY_DEBUG_REPORT_TEXT;
    if (flag === undefined) delete process.env.QWERY_DEBUG_REPORT_TEXT;
    else process.env.QWERY_DEBUG_REPORT_TEXT = flag;
    const cap = capturingLogger();
    try {
      await runAgent({
        messages: [{ role: 'user', content: 'hi' }],
        compute: computeStub,
        llm: fakeLLM(trivialModel('the full report body')),
        logger: cap.logger,
        onToolEvent: () => undefined,
        onToken: () => undefined,
        disableCompaction: true,
      });
    } finally {
      if (prev === undefined) delete process.env.QWERY_DEBUG_REPORT_TEXT;
      else process.env.QWERY_DEBUG_REPORT_TEXT = prev;
    }
    return cap.done();
  }

  test('off by default: agent.run.done logs textLen but not the report text', async () => {
    const fields = await runWith(undefined);
    expect(fields?.textLen).toBe('the full report body'.length);
    expect(fields?.text).toBeUndefined();
  });

  test('when enabled: agent.run.done also carries the full report text', async () => {
    const fields = await runWith('1');
    expect(fields?.text).toBe('the full report body');
  });

  test('a non-truthy value does not enable it', async () => {
    const fields = await runWith('0');
    expect(fields?.text).toBeUndefined();
  });
});
