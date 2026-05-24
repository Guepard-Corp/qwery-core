import { describe, expect, test } from 'bun:test';
import type { ModelMessage } from 'ai';
import { DEFAULT_PROTECTED_TOOLS, PRUNE_MARKER, prune } from '../prune';

/** Helper: build a tool-result message with N kB of output for a given tool. */
function toolResult(toolName: string, sizeKB: number): ModelMessage {
  return {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolName,
        output: 'x'.repeat(sizeKB * 1024),
      },
    ],
  } as unknown as ModelMessage;
}

function userMsg(text = 'go'): ModelMessage {
  return { role: 'user', content: text };
}

describe('prune', () => {
  test('returns skipped on empty input', () => {
    const result = prune([]);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('empty');
  });

  test('skips when total prunable < minSaving', () => {
    const messages: ModelMessage[] = [
      userMsg('first'),
      toolResult('schema', 1),
      userMsg('second'),
      toolResult('schema', 1),
      userMsg('third'),
    ];
    const result = prune(messages);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('minimum');
  });

  test('prunes large old tool outputs and protects recent turns', () => {
    // Small thresholds: protectedTurns=1 (only the last user turn fully
    // protected), protectBudget=1000 (filled instantly by the recent small
    // output), minSaving=10000 (so the big output triggers pruning).
    const messages: ModelMessage[] = [
      userMsg('turn-1'),
      toolResult('present', 200), // ~50k tokens → prunable
      userMsg('turn-2'),
      toolResult('present', 5),
      userMsg('turn-3'),
      toolResult('present', 5),
    ];
    const result = prune(messages, {
      protectedTurns: 1,
      protectBudget: 1_000,
      minSaving: 10_000,
    });
    expect(result.skipped).toBe(false);
    expect(result.prunedParts).toBeGreaterThanOrEqual(1);
    expect(result.prunedTokens).toBeGreaterThanOrEqual(10_000);
    const prunedMessage = result.messages[1] as { content: Array<Record<string, unknown>> };
    expect(prunedMessage.content[0]!.output).toBe(PRUNE_MARKER);
    expect(prunedMessage.content[0]!.compactedAt).toBeGreaterThan(0);
  });

  test('protects skill tool outputs even when old', () => {
    const messages: ModelMessage[] = [
      userMsg('turn-1'),
      toolResult('skill', 500), // ~125k tokens but skill tool is protected
      userMsg('turn-2'),
      userMsg('turn-3'),
    ];
    expect(DEFAULT_PROTECTED_TOOLS).toContain('skill');
    const result = prune(messages);
    // Nothing should be pruned because skill is protected.
    expect(result.skipped).toBe(true);
    const stillThere = result.messages[1] as { content: Array<Record<string, unknown>> };
    expect(typeof stillThere.content[0]!.output).toBe('string');
    expect((stillThere.content[0]!.output as string).length).toBeGreaterThan(1000);
  });

  test('idempotent — already-compacted parts are not re-pruned', () => {
    const messages: ModelMessage[] = [
      userMsg('turn-1'),
      toolResult('present', 200),
      userMsg('turn-2'),
      toolResult('present', 5),
      userMsg('turn-3'),
    ];
    const opts = { protectedTurns: 1, protectBudget: 1_000, minSaving: 10_000 };
    const first = prune(messages, opts);
    expect(first.skipped).toBe(false);
    const second = prune(first.messages, opts);
    // Second pass should not find more to prune.
    expect(second.skipped).toBe(true);
  });

  test('does not mutate the original messages', () => {
    const original: ModelMessage[] = [
      userMsg('turn-1'),
      toolResult('present', 200),
      userMsg('turn-2'),
      toolResult('present', 5),
      userMsg('turn-3'),
    ];
    const snapshot = JSON.stringify(original);
    prune(original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
