import { describe, expect, test } from 'bun:test';
import { delay, renderApp, settleEffectsBetweenTests, waitForFrame } from './support/harness';
import { captureFrame } from './support/screenshot';

const UP_ARROW = '\x1B[A';

/**
 * Non-slash input-bar behaviours: ↑ recalls history, and typing `/` shows the
 * slash-command autocomplete. Both are observable in the rendered input box.
 */

describe('e2e: input bar', () => {
  settleEffectsBetweenTests();

  test('↑ recalls the previous entry into the input', async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    try {
      await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'boot' });

      // A `!cmd` is added to history (and runs locally, no LLM). Its output ("echo
      // hist-marker") shows in chat WITHOUT the leading "!", so the recalled input
      // line ("!echo hist-marker", with "!") is unambiguously from the input box.
      stdin.write('!echo hist-marker');
      await delay(50);
      stdin.write('\r');
      await waitForFrame(lastFrame, (f) => f.includes('hist-marker'), { label: 'history-seed' });

      stdin.write(UP_ARROW);
      const frame = await waitForFrame(lastFrame, (f) => f.includes('!echo hist-marker'), {
        label: 'input-history',
      });
      expect(frame).toContain('!echo hist-marker');
      captureFrame('input-history', frame);
    } finally {
      unmount();
    }
  });

  test('typing "/" shows the slash autocomplete', async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    try {
      await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'boot' });

      // Type a prefix WITHOUT submitting → the autocomplete box renders.
      stdin.write('/mod');
      const frame = await waitForFrame(lastFrame, (f) => f.includes('enter to run'), {
        label: 'input-autocomplete',
      });
      expect(frame).toContain('enter to run');
      expect(frame).toContain('/models');
      captureFrame('input-autocomplete', frame);
    } finally {
      unmount();
    }
  });
});
