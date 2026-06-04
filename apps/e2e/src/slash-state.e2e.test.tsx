import { describe, expect, test } from 'bun:test';
import { renderApp, sendCommand, settleEffectsBetweenTests, waitForFrame } from './support/harness';
import { captureFrame } from './support/screenshot';

/**
 * Tier 2 slash commands (apps/e2e/PLAN.md): commands that mutate UI state rather
 * than print a line. We assert the observable layout/state transition.
 */

describe('e2e: Tier 2 slash commands', () => {
  settleEffectsBetweenTests();

  test('/layout toggles split → focus (TabBar appears)', async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    try {
      // Default layout is split: two panes (Chat + Results), no TabBar.
      const split = await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'layout-split' });
      expect(split).toContain('Results');
      expect(split).not.toContain('Tab: switch');
      captureFrame('layout-split', split);

      // /layout → focus: a single view behind a TabBar (unique "Tab: switch" hint).
      await sendCommand(stdin, lastFrame, '/layout');
      const focus = await waitForFrame(lastFrame, (f) => f.includes('Tab: switch'), {
        label: 'layout-focus',
      });
      expect(focus).toContain('Tab: switch');
      expect(focus).not.toBe(split);

      const snapshot = captureFrame('layout-focus', focus);
      expect(snapshot).toMatchSnapshot();
    } finally {
      unmount();
    }
  });

  test('/clear removes prior chat entries', async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    try {
      // Seed an entry via /help, confirm it shows.
      await sendCommand(stdin, lastFrame, '/help');
      await waitForFrame(lastFrame, (f) => f.includes('Slash commands:'), { label: 'clear-before' });

      // /clear wipes the chat.
      await sendCommand(stdin, lastFrame, '/clear');
      const cleared = await waitForFrame(lastFrame, (f) => !f.includes('Slash commands:'), {
        label: 'clear-after',
      });
      expect(cleared).not.toContain('Slash commands:');

      const snapshot = captureFrame('clear-after', cleared);
      expect(snapshot).toMatchSnapshot();
    } finally {
      unmount();
    }
  });
});
