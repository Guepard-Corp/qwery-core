import { describe, expect, test } from 'bun:test';
import type { ToolEvent } from '@qwery/domain';
import { createTracker } from '../track';

describe('createTracker', () => {
  test('emits running then done on success and returns the LLM payload', async () => {
    const events: ToolEvent[] = [];
    const track = createTracker((e) => events.push(e));
    const result = await track('schema', { datasource: 'sales' }, async () => ({
      ui: {
        kind: 'schema',
        target: 'sales',
        schema: { columns: [] } as never,
      },
      llm: { ok: true as const, datasource: 'sales' },
    }));
    expect(result).toEqual({ ok: true, datasource: 'sales' });
    expect(events).toHaveLength(2);
    expect(events[0]?.status).toBe('running');
    expect(events[1]?.status).toBe('done');
    expect(events[1]?.output?.kind).toBe('schema');
  });

  test('converts thrown errors to { ok: false, error } and emits an error event', async () => {
    const events: ToolEvent[] = [];
    const track = createTracker((e) => events.push(e));
    const result = await track('runQuery', { sql: '...' }, async () => {
      throw new Error('boom');
    });
    expect(result).toEqual({ ok: false, error: 'boom' });
    expect(events).toHaveLength(2);
    expect(events[1]?.status).toBe('error');
    expect(events[1]?.output).toEqual({ kind: 'error', message: 'boom' });
  });

  test('non-Error thrown values are stringified', async () => {
    const events: ToolEvent[] = [];
    const track = createTracker((e) => events.push(e));
    const result = await track('bash', {}, async () => {
      throw 'string-thrown';
    });
    expect(result).toEqual({ ok: false, error: 'string-thrown' });
  });

  test('each invocation gets a unique id', async () => {
    const events: ToolEvent[] = [];
    const track = createTracker((e) => events.push(e));
    await track('schema', {}, async () => ({
      ui: { kind: 'schema', target: 'a', schema: { columns: [] } as never },
      llm: 1,
    }));
    await track('schema', {}, async () => ({
      ui: { kind: 'schema', target: 'b', schema: { columns: [] } as never },
      llm: 2,
    }));
    const startedIds = events.filter((e) => e.status === 'running').map((e) => e.id);
    expect(new Set(startedIds).size).toBe(2);
  });

  test('event timestamps are monotonic per call', async () => {
    const events: ToolEvent[] = [];
    const track = createTracker((e) => events.push(e));
    await track('schema', {}, async () => {
      await new Promise((r) => setTimeout(r, 5));
      return { ui: { kind: 'schema', target: 'x', schema: { columns: [] } as never }, llm: 0 };
    });
    expect(events[1]!.endedAt!).toBeGreaterThanOrEqual(events[0]!.startedAt);
  });
});
