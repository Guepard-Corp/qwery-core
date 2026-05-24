import { describe, expect, test } from 'bun:test';
import { renderApp, sendCommand, waitForFrame } from './support/harness';
import { captureFrame } from './support/screenshot';

describe('e2e: TUI launch → /context', () => {
  test('renders the header, then opens the context overlay on /context', async () => {
    const { lastFrame, stdin, unmount } = renderApp();

    try {
      // 1. The app boots and paints its header.
      const booted = await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'boot' });
      expect(booted).toContain('qwery');

      // 2. Submit the slash command.
      await sendCommand(stdin, lastFrame, '/context');

      // 3. The context overlay takes over the screen.
      const overlay = await waitForFrame(lastFrame, (f) => f.includes('Context Usage'), {
        label: 'context-overlay',
      });
      expect(overlay).toContain('Context Usage');
      expect(overlay).toContain('esc close');

      // HTML artifact only — no text-frame snapshot here: the overlay shows the
      // system-prompt token estimate, which includes `listLocalApps()` file
      // listings (build artifacts like dist/, tsconfig.tsbuildinfo, artifacts/).
      // Those vary by machine/build state, so a frame snapshot is not portable.
      captureFrame('context-overlay', overlay);
    } finally {
      unmount();
    }
  });
});
