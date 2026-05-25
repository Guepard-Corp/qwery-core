import { describe, expect, test } from 'bun:test';
import { delay, renderApp, waitForFrame } from './support/harness';
import { captureFrame } from './support/screenshot';

/**
 * Non-slash flow: a `!cmd` line runs a local shell command. Its output shows in
 * chat but is **never persisted** and never sent to the LLM (local-only, ADR).
 * We assert both: the output appears, and the real sqlite message store stays empty.
 */

describe('e2e: !cmd local shell passthrough', () => {
  test('runs the command, shows output, persists nothing', async () => {
    const { lastFrame, stdin, unmount, services } = renderApp({ persistence: 'sqlite-memory' });

    try {
      await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'boot' });

      // `!` prefix → shell mode; the input bar submits the literal text.
      stdin.write('!echo qwery-e2e-shell-ok');
      await delay(50);
      stdin.write('\r');

      const frame = await waitForFrame(lastFrame, (f) => f.includes('qwery-e2e-shell-ok'), {
        label: 'chat-shell',
      });
      expect(frame).toContain('qwery-e2e-shell-ok');

      // Local-only invariant: shell output is not written to the message store.
      // Give any (erroneous) async persistence a chance to land before asserting.
      await delay(100);
      const messages = await services.messageRepo.findAll();
      expect(messages).toHaveLength(0);

      captureFrame('chat-shell', frame);
    } finally {
      unmount();
    }
  });
});
