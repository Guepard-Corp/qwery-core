import { describe, expect, test } from 'bun:test';
import { MessageRole } from '@qwery/domain';
import { delay, renderApp, waitFor, waitForFrame } from './support/harness';
import { makeMockModel } from './support/mock-services';
import { captureFrame } from './support/screenshot';

describe('e2e: chat turn persists to a real sqlite DB', () => {
  test('a prompt + mock reply are written to sqlite and a session is created', async () => {
    // Real bun:sqlite :memory: + real DuckDB; only the LLM is mocked.
    const { lastFrame, stdin, unmount, services } = renderApp({
      persistence: 'sqlite-memory',
      llm: makeMockModel('hi there'),
    });

    try {
      await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'boot' });

      stdin.write('hello');
      await delay(50);
      stdin.write('\r');

      // Wait until both messages are durably in the real DB.
      const messages = await waitFor(
        () => services.messageRepo.findAll(),
        (m) => m.length >= 2,
      );

      const roles = messages.map((m) => m.role);
      expect(roles).toContain(MessageRole.USER);
      expect(roles).toContain(MessageRole.ASSISTANT);

      // A session was created and persisted alongside the messages.
      const sessions = await services.sessionRepo.findAll();
      expect(sessions.length).toBe(1);

      // HTML screenshot + text-frame snapshot of the rendered conversation.
      const frame = await waitForFrame(lastFrame, (f) => f.includes('hi there'), { label: 'chat-turn' });
      const snapshot = captureFrame('chat-turn', frame);
      expect(snapshot).toMatchSnapshot();
    } finally {
      unmount();
    }
  });
});
