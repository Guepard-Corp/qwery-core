import { describe, it, expect } from 'vitest';
import type { MessageOutput } from '@qwery/domain/usecases';
import { convertMessages } from '../messages-converter';

describe('convertMessages', () => {
  it('filters out hidden or summary messages', () => {
    const baseDate = new Date();
    const visible: MessageOutput = {
      id: 'visible-1',
      role: 'assistant',
      content: {
        role: 'assistant',
        parts: [{ type: 'text', text: 'hello' }],
      },
      metadata: {},
      createdAt: baseDate,
      updatedAt: baseDate,
    } as unknown as MessageOutput;

    const hiddenSummary: MessageOutput = {
      id: 'hidden-1',
      role: 'assistant',
      content: {
        role: 'assistant',
        parts: [{ type: 'text', text: 'internal summary' }],
      },
      metadata: { hidden: true, summary: true },
      createdAt: baseDate,
      updatedAt: baseDate,
    } as unknown as MessageOutput;

    const result = convertMessages([visible, hiddenSummary]);
    expect(result).toBeDefined();
    expect(result!.map((m) => m.id)).toEqual(['visible-1']);
  });

  it('filters out messages hidden or summary via content metadata', () => {
    const baseDate = new Date();
    const visible: MessageOutput = {
      id: 'visible-1',
      role: 'assistant',
      content: {
        role: 'assistant',
        parts: [{ type: 'text', text: 'hello' }],
      },
      metadata: {},
      createdAt: baseDate,
      updatedAt: baseDate,
    } as unknown as MessageOutput;

    const hiddenViaContentMeta: MessageOutput = {
      id: 'hidden-2',
      role: 'assistant',
      content: {
        role: 'assistant',
        metadata: { hidden: true, summary: true },
        parts: [{ type: 'text', text: 'internal summary (content metadata)' }],
      },
      metadata: {},
      createdAt: baseDate,
      updatedAt: baseDate,
    } as unknown as MessageOutput;

    const result = convertMessages([visible, hiddenViaContentMeta]);
    expect(result).toBeDefined();
    expect(result!.map((m) => m.id)).toEqual(['visible-1']);
  });
});
