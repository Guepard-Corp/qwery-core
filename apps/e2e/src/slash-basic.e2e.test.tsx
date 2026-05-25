import { describe, expect, test } from 'bun:test';
import { renderApp, sendCommand, waitForFrame } from './support/harness';
import { captureFrame } from './support/screenshot';

/**
 * Tier 1 slash commands (apps/e2e/PLAN.md): instant, deterministic chat output,
 * no I/O. Each renders the real <App>, submits the command, asserts the chat
 * text, and captures an HTML screenshot + a text-frame snapshot.
 */

interface Case {
  command: string;
  expected: string;
  artifact: string;
  /**
   * Whether to assert the full text-frame snapshot. Disabled for frames that
   * embed machine-specific state — `/logs` prints the absolute log path
   * (`<cwd>/.qwery/logs/qwery.log`), which differs per machine/CI and even
   * changes the line wrapping by its length. The `toContain` check still
   * verifies the behaviour; the HTML artifact is still captured.
   */
  snapshot?: boolean;
}

const cases: Case[] = [
  { command: '/help', expected: 'Slash commands:', artifact: 'slash-help' },
  { command: '/data', expected: 'Agent routing pinned to: DataAgent.', artifact: 'slash-data' },
  { command: '/code', expected: 'Agent routing pinned to: CodingAgent.', artifact: 'slash-code' },
  { command: '/auto', expected: 'Agent routing pinned to: auto (heuristic).', artifact: 'slash-auto' },
  { command: '/logs', expected: 'Logs are written to', artifact: 'slash-logs', snapshot: false },
];

describe('e2e: Tier 1 slash commands', () => {
  for (const { command, expected, artifact, snapshot } of cases) {
    test(`${command} → "${expected}"`, async () => {
      const { lastFrame, stdin, unmount } = renderApp();
      try {
        await sendCommand(stdin, lastFrame, command);
        const frame = await waitForFrame(lastFrame, (f) => f.includes(expected), { label: artifact });
        expect(frame).toContain(expected);

        const captured = captureFrame(artifact, frame);
        if (snapshot !== false) expect(captured).toMatchSnapshot();
      } finally {
        unmount();
      }
    });
  }
});
