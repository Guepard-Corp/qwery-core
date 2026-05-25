import { describe, expect, test } from 'bun:test';
import { delay, renderApp, waitForFrame } from './support/harness';
import { makeToolCallModel } from './support/mock-services';
import { captureFrame } from './support/screenshot';

/**
 * Non-slash flow: a chat turn where the agent calls the privacy-safe `runQuery`
 * tool, which executes against REAL DuckDB (sqlite-memory tier), then streams a
 * final reply. Exercises the full loop: LLM → tool-call → DuckDB → LLM → text.
 */

describe('e2e: chat turn with a runQuery tool call (real DuckDB)', () => {
  test('runs an aggregate query and reports the result', async () => {
    // count(*) over an inline VALUES table → aggregate-only (passes the privacy
    // validator), single row, runs on DuckDB :memory: without any attached data.
    const sql = 'SELECT count(*) AS n FROM (VALUES (1), (2), (3)) AS t(x)';
    const { lastFrame, stdin, unmount } = renderApp({
      persistence: 'sqlite-memory',
      llm: makeToolCallModel('runQuery', { sql }, 'There are 3 rows.'),
    });

    try {
      await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'boot' });

      stdin.write('how many rows?');
      await delay(50);
      stdin.write('\r');

      // The final reply appears only after the tool round-trip completed.
      const frame = await waitForFrame(lastFrame, (f) => f.includes('There are 3 rows.'), {
        label: 'chat-tool',
        timeoutMs: 5000,
      });
      expect(frame).toContain('There are 3 rows.');
      // The runQuery tool call is surfaced (its SQL is rendered in the tool entry).
      expect(frame).toContain('count(*)');

      captureFrame('chat-tool', frame); // contains a runtime duration → no snapshot
    } finally {
      unmount();
    }
  });
});
