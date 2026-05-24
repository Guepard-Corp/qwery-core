import { describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { createUsage, UsageSchema } from '../usage.entity';

describe('createUsage', () => {
  test('assigns a uuid id and defaults timestamp to now', () => {
    const before = Date.now();
    const u = createUsage({
      model: 'anthropic/claude-opus',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    });
    expect(u.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(u.timestamp.getTime()).toBeGreaterThanOrEqual(before);
  });

  test('uses provided timestamp when given', () => {
    const fixed = new Date('2026-05-24T12:00:00Z');
    const u = createUsage({ model: 'x', timestamp: fixed });
    expect(u.timestamp.getTime()).toBe(fixed.getTime());
  });

  test('fills missing token counters with default 0', () => {
    const u = createUsage({ model: 'x' });
    expect(u.inputTokens).toBe(0);
    expect(u.outputTokens).toBe(0);
    expect(u.totalTokens).toBe(0);
    expect(u.reasoningTokens).toBe(0);
    expect(u.cachedInputTokens).toBe(0);
    expect(u.cacheWriteTokens).toBe(0);
    expect(u.costUSD).toBe(0);
    expect(u.durationMs).toBe(0);
    expect(u.contextSize).toBe(0);
  });

  test('preserves sessionId and messageId when provided', () => {
    const sid = randomUUID();
    const mid = randomUUID();
    const u = createUsage({ model: 'x', sessionId: sid, messageId: mid });
    expect(u.sessionId).toBe(sid);
    expect(u.messageId).toBe(mid);
  });
});

describe('UsageSchema', () => {
  test('rejects negative token counts', () => {
    expect(() => createUsage({ model: 'x', inputTokens: -1 })).toThrow();
  });

  test('rejects non-integer token counts', () => {
    expect(() => createUsage({ model: 'x', inputTokens: 1.5 })).toThrow();
  });

  test('rejects negative cost', () => {
    expect(() => createUsage({ model: 'x', costUSD: -0.01 })).toThrow();
  });

  test('rejects an invalid sessionId uuid', () => {
    expect(() =>
      UsageSchema.parse({
        id: randomUUID(),
        sessionId: 'not-a-uuid',
        model: 'x',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        costUSD: 0,
        inputCostUSD: 0,
        outputCostUSD: 0,
        durationMs: 0,
        contextSize: 0,
        timestamp: new Date(),
      }),
    ).toThrow();
  });
});
