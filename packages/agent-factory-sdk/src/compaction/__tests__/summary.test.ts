import { describe, expect, test } from 'bun:test';
import type { ModelMessage } from 'ai';
import { clipToolOutputs, generateSummary, type SummaryGenerator } from '../summary';

function fakeGenerator(canned: string): SummaryGenerator {
  return async ({ messages, system }) => {
    // Pass-through assertion: the user prompt must include the template
    // markers (so the LLM sees the structure we want).
    const userText = messages.findLast((m) => m.role === 'user');
    if (userText && typeof userText.content === 'string') {
      if (!userText.content.includes('## Goal')) {
        throw new Error('summary prompt missing template');
      }
    }
    if (!system.includes('summarization')) {
      throw new Error('system prompt missing identity');
    }
    return { text: canned, tokens: { input: 100, output: 50 } };
  };
}

describe('clipToolOutputs', () => {
  test('truncates string outputs over the cap', () => {
    const msgs: ModelMessage[] = [
      {
        role: 'tool',
        content: [{ type: 'tool-result', toolName: 'x', output: 'y'.repeat(5_000) }],
      } as unknown as ModelMessage,
    ];
    const clipped = clipToolOutputs(msgs, 1_000);
    const part = (clipped[0] as { content: Array<Record<string, unknown>> }).content[0]!;
    expect((part.output as string).length).toBeLessThan(2_000);
    expect(part.output).toContain('truncated');
  });

  test('serializes + truncates object outputs', () => {
    const big = { rows: Array.from({ length: 1_000 }, (_, i) => ({ i })) };
    const msgs: ModelMessage[] = [
      {
        role: 'tool',
        content: [{ type: 'tool-result', toolName: 'x', output: big }],
      } as unknown as ModelMessage,
    ];
    const clipped = clipToolOutputs(msgs, 500);
    const part = (clipped[0] as { content: Array<Record<string, unknown>> }).content[0]!;
    expect((part.output as string).length).toBeLessThan(800);
  });

  test('leaves non-tool messages alone', () => {
    const original: ModelMessage[] = [{ role: 'user', content: 'hello' }];
    const clipped = clipToolOutputs(original, 10);
    expect(clipped).toEqual(original);
  });
});

describe('generateSummary', () => {
  test('uses the first-summary prompt when no previousSummary', async () => {
    const head: ModelMessage[] = [
      { role: 'user', content: 'task description' },
      { role: 'assistant', content: 'doing things' },
    ];
    const result = await generateSummary({
      head,
      generator: fakeGenerator('## Goal\n- done'),
    });
    expect(result.summary).toContain('Goal');
    expect(result.usage.input).toBe(100);
  });

  test('uses the incremental prompt when previousSummary is provided', async () => {
    const gen: SummaryGenerator = async ({ messages }) => {
      const last = messages.at(-1)!;
      const text = typeof last.content === 'string' ? last.content : '';
      expect(text).toContain('<previous-summary>');
      expect(text).toContain('PREVIOUS HERE');
      return { text: '## Goal\n- updated', tokens: { input: 1, output: 1 } };
    };
    const result = await generateSummary({
      head: [{ role: 'user', content: 'next step' }],
      previousSummary: 'PREVIOUS HERE',
      generator: gen,
    });
    expect(result.summary).toContain('updated');
  });
});
