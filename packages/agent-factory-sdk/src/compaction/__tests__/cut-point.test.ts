import { describe, expect, test } from 'bun:test';
import type { ModelMessage } from 'ai';
import { findCutPoint } from '../cut-point';

function userMsg(size = 200): ModelMessage {
  return { role: 'user', content: 'u'.repeat(size) };
}
function assistantMsg(size = 200): ModelMessage {
  return { role: 'assistant', content: 'a'.repeat(size) };
}

describe('findCutPoint', () => {
  test('handles empty input', () => {
    expect(findCutPoint([], 1_000)).toEqual({
      tailStartIndex: 0,
      tailTokens: 0,
      splitInsideTurn: false,
    });
  });

  test('keeps everything when total fits the budget', () => {
    const messages = [userMsg(100), assistantMsg(100), userMsg(100), assistantMsg(100)];
    const result = findCutPoint(messages, 1_000);
    expect(result.tailStartIndex).toBe(0);
    expect(result.splitInsideTurn).toBe(false);
  });

  test('cuts at the earliest turn boundary whose suffix fits', () => {
    // 4 turns, each ~50 tokens. Budget = 110 → should keep last 2 turns.
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 4; i++) {
      messages.push(userMsg(200)); // 50 tokens
      messages.push(assistantMsg(200)); // 50 tokens
    }
    const result = findCutPoint(messages, 110);
    // Last 2 turns = 4 messages = 200 tokens > 110 → should fit only 1 turn
    expect(result.splitInsideTurn).toBe(false);
    expect(result.tailStartIndex).toBeGreaterThanOrEqual(2);
    expect(result.tailStartIndex).toBeLessThan(messages.length);
  });

  test('falls back to inside-turn split when no full turn fits', () => {
    // One giant turn — user + 3 assistant messages each large.
    const messages: ModelMessage[] = [
      userMsg(4_000),
      assistantMsg(4_000),
      assistantMsg(4_000),
      assistantMsg(200),
    ];
    const result = findCutPoint(messages, 100);
    expect(result.splitInsideTurn).toBe(true);
    expect(result.tailStartIndex).toBe(messages.length - 1);
  });

  test('keeps only last message when even it exceeds the budget', () => {
    const messages = [userMsg(100), assistantMsg(50_000)];
    const result = findCutPoint(messages, 10);
    expect(result.tailStartIndex).toBe(1);
    expect(result.splitInsideTurn).toBe(true);
  });

  test('zero budget returns end-of-array', () => {
    const result = findCutPoint([userMsg(), assistantMsg()], 0);
    expect(result.tailStartIndex).toBe(2);
  });
});
