import { describe, expect, test } from 'bun:test';
import type { ModelMessage } from 'ai';
import { estimateMessageTokens, estimateTextTokens, estimateTotalTokens } from '../tokens';

describe('estimateTextTokens', () => {
  test('returns 0 for empty input', () => {
    expect(estimateTextTokens('')).toBe(0);
  });
  test('approximates chars/4 with ceil', () => {
    expect(estimateTextTokens('abcd')).toBe(1);
    expect(estimateTextTokens('abcde')).toBe(2);
    expect(estimateTextTokens('a'.repeat(100))).toBe(25);
  });
  test('caps at MAX_PART_TOKENS (50k)', () => {
    expect(estimateTextTokens('x'.repeat(10_000_000))).toBe(50_000);
  });
});

describe('estimateMessageTokens', () => {
  test('handles string content', () => {
    const msg: ModelMessage = { role: 'user', content: 'hello world' };
    expect(estimateMessageTokens(msg)).toBe(Math.ceil('hello world'.length / 4));
  });
  test('handles array of parts (text)', () => {
    const msg: ModelMessage = {
      role: 'user',
      content: [
        { type: 'text', text: 'aaaa' },
        { type: 'text', text: 'bbbb' },
      ],
    } as ModelMessage;
    expect(estimateMessageTokens(msg)).toBe(2);
  });
  test('handles tool-call input + tool-result output', () => {
    const msg: ModelMessage = {
      role: 'assistant',
      content: [
        { type: 'tool-call', toolName: 'schema', input: { target: 'foo' } },
        { type: 'tool-result', toolName: 'schema', output: 'large result string' },
      ],
    } as ModelMessage;
    expect(estimateMessageTokens(msg)).toBeGreaterThan(0);
  });
  test('returns 0 for unknown content shape', () => {
    const msg = { role: 'system', content: undefined } as unknown as ModelMessage;
    expect(estimateMessageTokens(msg)).toBe(0);
  });
});

describe('estimateTotalTokens', () => {
  test('sums across messages', () => {
    const msgs: ModelMessage[] = [
      { role: 'user', content: 'abcd' },
      { role: 'assistant', content: 'efgh' },
    ];
    expect(estimateTotalTokens(msgs)).toBe(2);
  });
  test('empty array yields 0', () => {
    expect(estimateTotalTokens([])).toBe(0);
  });
});
