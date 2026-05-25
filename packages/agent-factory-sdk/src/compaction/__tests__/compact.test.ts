import { describe, expect, test } from 'bun:test';
import type { ModelMessage } from 'ai';
import { runCompaction, SUMMARY_MARKER_OPEN } from '../compact';
import type { SummaryGenerator } from '../summary';

function userMsg(text = 'go', size = 50): ModelMessage {
  return { role: 'user', content: text.repeat(Math.max(1, Math.floor(size / text.length))) };
}
function bigToolResult(toolName: string, kb: number): ModelMessage {
  return {
    role: 'tool',
    content: [{ type: 'tool-result', toolName, output: 'x'.repeat(kb * 1024) }],
  } as unknown as ModelMessage;
}

const summaryGen: SummaryGenerator = async () => ({
  text: '## Goal\n- summarized',
  tokens: { input: 200, output: 50 },
});

describe('runCompaction', () => {
  test('phase = none when not overflowing', async () => {
    const result = await runCompaction({
      messages: [userMsg('hi')],
      promptTokens: 100,
      contextLimit: 200_000,
    });
    expect(result.phase).toBe('none');
    expect(result.savedTokens).toBe(0);
  });

  test('phase = prune-only when prune is enough', async () => {
    const messages: ModelMessage[] = [
      userMsg('turn-1'),
      bigToolResult('present', 200), // ~50k tokens
      userMsg('turn-2'),
      bigToolResult('present', 5),
      userMsg('turn-3'),
      bigToolResult('present', 5),
    ];
    const result = await runCompaction({
      messages,
      promptTokens: 60_000,
      contextLimit: 70_000,
      protectedTurns: 1,
      protectBudget: 1_000,
      pruneMinSaving: 10_000,
    });
    expect(['prune-only', 'prune-and-summary']).toContain(result.phase);
    expect(result.prunedParts).toBeGreaterThan(0);
  });

  test('summary phase requires a generator', async () => {
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 10; i++) {
      messages.push(userMsg(`turn-${i}`));
      messages.push(bigToolResult('schema', 30)); // 30kB each
    }
    // No generator — but prune should hopefully not be enough → throw.
    await expect(
      runCompaction({
        messages,
        promptTokens: 150_000,
        contextLimit: 100_000,
      }),
    ).rejects.toThrow(/summaryGenerator/);
  });

  test('summary phase produces a marker message at index 0', async () => {
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 30; i++) {
      messages.push(userMsg(`turn-${i}`));
      // Small tool outputs so prune can't save us — force the summary path.
      messages.push({
        role: 'assistant',
        content: 'a'.repeat(8_000),
      } as ModelMessage);
    }
    const result = await runCompaction({
      messages,
      promptTokens: 200_000,
      contextLimit: 100_000,
      summaryGenerator: summaryGen,
    });
    expect(result.phase === 'summary-only' || result.phase === 'prune-and-summary').toBe(true);
    const first = result.messages[0] as { content: string };
    expect(first.content).toContain(SUMMARY_MARKER_OPEN);
    expect(first.content).toContain('summarized');
  });

  test('force triggers summary even when not overflowing — when head has content', async () => {
    // Build enough messages so that after picking a small tail, the head is
    // non-empty and the summarizer is invoked.
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 8; i++) {
      messages.push(userMsg(`turn-${i}`));
      messages.push({ role: 'assistant', content: 'a'.repeat(3_000) } as ModelMessage);
    }
    const result = await runCompaction({
      messages,
      promptTokens: 100,
      contextLimit: 200_000,
      force: true,
      preserveTailMax: 2_000,
      preserveTailMin: 1_000,
      summaryGenerator: summaryGen,
    });
    expect(result.phase).not.toBe('none');
    expect(result.summary).toContain('summarized');
  });

  test('replays the most recent user message when the cut splits inside its turn', async () => {
    // The LAST user message is followed by a huge assistant message that
    // fills the tail budget on its own. The cut falls AFTER the user msg
    // — meaning the user msg would be summarized away. Replay re-injects.
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 4; i++) {
      messages.push(userMsg(`turn-${i}`));
      messages.push({ role: 'assistant', content: 'a'.repeat(3_000) } as ModelMessage);
    }
    messages.push({ role: 'user', content: 'FINAL_QUESTION' } as ModelMessage);
    messages.push({ role: 'assistant', content: 'b'.repeat(20_000) } as ModelMessage);

    const result = await runCompaction({
      messages,
      promptTokens: 200_000,
      contextLimit: 100_000,
      preserveTailMax: 2_000,
      preserveTailMin: 1_000,
      summaryGenerator: summaryGen,
    });
    expect(result.replayedUserMessage).toBe(true);
    const replayed = result.messages.find(
      (m) => typeof m.content === 'string' && m.content === 'FINAL_QUESTION',
    );
    expect(replayed).toBeDefined();
    expect(replayed!.role).toBe('user');
  });

  test('does not replay when the tail already starts with a user message', async () => {
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 30; i++) {
      messages.push(userMsg(`turn-${i}`));
      messages.push({ role: 'assistant', content: 'a'.repeat(2_000) } as ModelMessage);
    }
    const result = await runCompaction({
      messages,
      promptTokens: 200_000,
      contextLimit: 100_000,
      summaryGenerator: summaryGen,
    });
    expect(result.replayedUserMessage).toBe(false);
  });

  test('protected skill outputs are never pruned even under pressure', async () => {
    const messages: ModelMessage[] = [
      userMsg('turn-1'),
      bigToolResult('skill', 500), // huge skill output
      userMsg('turn-2'),
      userMsg('turn-3'),
    ];
    const result = await runCompaction({
      messages,
      promptTokens: 200_000,
      contextLimit: 50_000,
      summaryGenerator: summaryGen,
    });
    // The skill output should still exist somewhere in the resulting messages.
    const skillStillThere = result.messages.some((m) => {
      const content = (m as { content?: unknown }).content;
      if (!Array.isArray(content)) return false;
      return content.some((p) => {
        const part = p as Record<string, unknown>;
        return (
          part.toolName === 'skill' &&
          typeof part.output === 'string' &&
          (part.output as string).length > 1000
        );
      });
    });
    // Could be summarized away in the head, but the tool itself is in the
    // protected list — prune should NOT have wiped it specifically. We only
    // assert the marker is not present on a `skill` part.
    const wipedSkill = result.messages.some((m) => {
      const content = (m as { content?: unknown }).content;
      if (!Array.isArray(content)) return false;
      return content.some((p) => {
        const part = p as Record<string, unknown>;
        return part.toolName === 'skill' && (part as { compactedAt?: unknown }).compactedAt !== undefined;
      });
    });
    expect(wipedSkill).toBe(false);
    expect(skillStillThere || result.phase.includes('summary')).toBe(true);
  });
});
