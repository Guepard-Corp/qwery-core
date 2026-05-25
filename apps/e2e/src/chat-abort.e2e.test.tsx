import { describe, expect, test } from 'bun:test';
import type { LLMProvider } from '@qwery/domain';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import { delay, renderApp, waitForFrame } from './support/harness';
import { captureFrame } from './support/screenshot';

/**
 * Non-slash flow: Ctrl+C while a turn is streaming aborts THAT turn (not the
 * app). The model streams a marker delta then stalls; we send Ctrl+C mid-stream
 * and assert the interrupted marker appears and the app keeps running.
 */

const MARKER = 'partial-output-marker';

/** A model that emits one delta, then drip-feeds slowly so there's a window to abort. */
function makeSlowModel(): LLMProvider {
  const model = new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: 0,
        chunkDelayInMs: 250,
        chunks: [
          { type: 'stream-start', warnings: [] },
          { type: 'text-start', id: 't' },
          { type: 'text-delta', id: 't', delta: `${MARKER} ` },
          { type: 'text-delta', id: 't', delta: 'still-streaming ' },
          { type: 'text-delta', id: 't', delta: 'still-streaming ' },
          { type: 'text-delta', id: 't', delta: 'still-streaming ' },
          { type: 'text-delta', id: 't', delta: 'still-streaming ' },
          { type: 'text-end', id: 't' },
          {
            type: 'finish',
            finishReason: 'stop',
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          },
        ],
      }) as unknown as ReadableStream<never>,
    }),
  });
  return { getModel: () => model as unknown as ReturnType<LLMProvider['getModel']> };
}

describe('e2e: Ctrl+C aborts the streaming turn (not the app)', () => {
  test('interrupts mid-stream and keeps the app alive', async () => {
    const { lastFrame, stdin, unmount } = renderApp({ llm: makeSlowModel() });

    try {
      await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'boot' });

      stdin.write('go');
      await delay(50);
      stdin.write('\r');

      // Wait until the turn is streaming (the marker delta is on screen).
      await waitForFrame(lastFrame, (f) => f.includes(MARKER), { label: 'abort-streaming' });

      // Ctrl+C (ETX) while busy → abort the turn.
      stdin.write('\x03');

      // The interrupted marker appears, and the app is still running (header present).
      const frame = await waitForFrame(lastFrame, (f) => f.includes('Interrupted'), {
        label: 'chat-abort',
        timeoutMs: 5000,
      });
      expect(frame).toContain('Interrupted');
      expect(frame).toContain('qwery');

      captureFrame('chat-abort', frame); // timing/partial text → no snapshot
    } finally {
      unmount();
    }
  });
});
