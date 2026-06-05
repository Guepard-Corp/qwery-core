import { describe, expect, test } from 'bun:test';
import { renderApp, sendCommand, settleEffectsBetweenTests, waitForFrame } from './support/harness';
import { captureFrame } from './support/screenshot';

/**
 * Tier 3 slash commands (apps/e2e/PLAN.md): commands that open an overlay.
 * We assert the overlay's title appears. `/agents` reads the filesystem and
 * `/resume` lists timestamped sessions, so those capture an HTML screenshot but
 * skip the (machine-dependent) text snapshot.
 */

describe('e2e: Tier 3 slash commands (overlays)', () => {
  settleEffectsBetweenTests();

  test('/models opens the provider picker', async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    try {
      await sendCommand(stdin, lastFrame, '/models');
      const frame = await waitForFrame(lastFrame, (f) => f.includes('Connect a provider'), {
        label: 'overlay-models',
      });
      expect(frame).toContain('Connect a provider');
      expect(captureFrame('overlay-models', frame)).toMatchSnapshot();
    } finally {
      unmount();
    }
  });

  test('/datasources opens the datasources overlay', async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    try {
      await sendCommand(stdin, lastFrame, '/datasources');
      const frame = await waitForFrame(lastFrame, (f) => f.includes('Datasources'), {
        label: 'overlay-datasources',
      });
      expect(frame).toContain('Datasources');
      expect(captureFrame('overlay-datasources', frame)).toMatchSnapshot();
    } finally {
      unmount();
    }
  });

  test('/agents opens the subagents overlay', async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    try {
      await sendCommand(stdin, lastFrame, '/agents');
      // "Subagents" is the header in both the empty and the populated states.
      const frame = await waitForFrame(lastFrame, (f) => f.includes('Subagents'), {
        label: 'overlay-agents',
      });
      expect(frame).toContain('Subagents');
      captureFrame('overlay-agents', frame); // fs-dependent content → no snapshot
    } finally {
      unmount();
    }
  });

  test('/resume opens the session list', async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    try {
      await sendCommand(stdin, lastFrame, '/resume');
      const frame = await waitForFrame(lastFrame, (f) => f.includes('Resume a session'), {
        label: 'overlay-resume',
      });
      expect(frame).toContain('Resume a session');
      captureFrame('overlay-resume', frame); // session rows carry timestamps → no snapshot
    } finally {
      unmount();
    }
  });
});
