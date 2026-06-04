import { describe, expect, test } from 'bun:test';
import { delay, renderApp, sendCommand, settleEffectsBetweenTests, waitForFrame } from './support/harness';
import { captureFrame } from './support/screenshot';

describe('e2e: auto-update UX', () => {
  settleEffectsBetweenTests();

  test('surfaces a staged update in the status bar and via /update', async () => {
    // Fake updater: qwery has a newer release staged, gfs is up to date.
    const { lastFrame, stdin, unmount } = renderApp({
      updater: {
        checkAndStage: async () => [
          { app: 'qwery', current: '0.2.0', latest: '0.3.0', action: 'stage' },
          { app: 'gfs', current: '0.1.13', latest: '0.1.13', action: 'up-to-date' },
        ],
      },
    });

    try {
      // The startup check resolves → status bar shows the staged-update hint.
      // The "⟳" glyph is unique to the hint and never wraps mid-token, unlike the
      // multi-word "update ready" which splits in the narrow terminal.
      const withHint = await waitForFrame(lastFrame, (f) => f.includes('⟳'), {
        label: 'updater-staged-hint',
      });
      expect(withHint).toContain('⟳');
      captureFrame('updater-staged-hint', withHint);

      // /update reports the per-artifact status. Assert single tokens (the narrow
      // test terminal wraps long lines, so multi-word phrases can't be matched).
      await sendCommand(stdin, lastFrame, '/update');
      const report = await waitForFrame(lastFrame, (f) => f.includes('0.3.0'), {
        label: 'updater-report',
      });
      expect(report).toContain('0.3.0');
      captureFrame('updater-report', report);
    } finally {
      unmount();
    }
  });

  test('shows no hint when everything is up to date', async () => {
    const { lastFrame, unmount } = renderApp({
      updater: {
        checkAndStage: async () => [
          { app: 'qwery', current: '0.3.0', latest: '0.3.0', action: 'up-to-date' },
        ],
      },
    });

    try {
      const booted = await waitForFrame(lastFrame, (f) => f.includes('qwery'), {
        label: 'updater-up-to-date',
      });
      await delay(100); // let the startup check settle
      const frame = lastFrame() ?? booted;
      expect(frame).not.toContain('⟳');
      captureFrame('updater-up-to-date', frame);
    } finally {
      unmount();
    }
  });
});
