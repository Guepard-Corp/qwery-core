import { describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { MessageRole } from '@qwery/domain';
import {
  createMessage,
  getMessage,
  listMessagesBySession,
  listMessagesBySessionPaginated,
  updateMessage,
} from '../message';
import { InMemoryMessageRepo } from './repo-mocks';

function seed() {
  return { messageRepo: new InMemoryMessageRepo() };
}

const sid = randomUUID();

describe('message use cases', () => {
  test('createMessage persists', async () => {
    const deps = seed();
    const msg = await createMessage(deps, {
      sessionId: sid,
      role: MessageRole.USER,
      content: { parts: [{ type: 'text', text: 'hi' }] },
    });
    expect(await getMessage(deps, msg.id)).toEqual(msg);
  });

  test('updateMessage throws when not found', async () => {
    const deps = seed();
    await expect(updateMessage(deps, 'missing', { content: { parts: [] } })).rejects.toThrow(/not found/);
  });

  test('updateMessage replaces content', async () => {
    const deps = seed();
    const msg = await createMessage(deps, {
      sessionId: sid,
      role: MessageRole.ASSISTANT,
      content: { parts: [{ type: 'text', text: 'a' }] },
    });
    const next = await updateMessage(deps, msg.id, {
      content: { parts: [{ type: 'text', text: 'b' }] },
    });
    const part = next.content.parts?.[0] as { text: string };
    expect(part.text).toBe('b');
  });

  test('listMessagesBySession filters by session', async () => {
    const deps = seed();
    const other = randomUUID();
    await createMessage(deps, {
      sessionId: sid,
      role: MessageRole.USER,
      content: { parts: [] },
    });
    await createMessage(deps, {
      sessionId: other,
      role: MessageRole.USER,
      content: { parts: [] },
    });
    expect((await listMessagesBySession(deps, sid)).length).toBe(1);
  });

  test('listMessagesBySessionPaginated returns a window with a cursor', async () => {
    const deps = seed();
    for (let i = 0; i < 3; i++) {
      await createMessage(deps, {
        sessionId: sid,
        role: MessageRole.USER,
        content: { parts: [{ type: 'text', text: String(i) }] },
      });
      // ensure different timestamps
      await new Promise((r) => setTimeout(r, 2));
    }
    const page = await listMessagesBySessionPaginated(deps, sid, {
      cursor: null,
      limit: 2,
      direction: 'before',
    });
    expect(page.messages).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBeTruthy();
  });
});
