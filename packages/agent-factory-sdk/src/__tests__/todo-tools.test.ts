import { describe, expect, test } from 'bun:test';
import { randomUUID as uuidv4 } from 'node:crypto';
import { createTodo, type Todo, TodoPriority, TodoStatus } from '@qwery/domain';
import { buildTodoTools, createTodoStore } from '../todo-tools';

async function exec(tool: { execute?: (input: unknown, ctx?: unknown) => unknown }, input: unknown) {
  const r = await tool.execute?.(input, { toolCallId: 't', messages: [] });
  return r as { ok: boolean; count: number; todos: Todo[]; counts?: Record<string, number> };
}

function fakeTodo(sessionId: string, content = 'thing'): Todo {
  return createTodo({
    sessionId,
    content,
    status: TodoStatus.PENDING,
    priority: TodoPriority.MEDIUM,
  });
}

describe('TodoStore', () => {
  test('read returns empty array for an unknown session', () => {
    const store = createTodoStore();
    expect(store.read('missing')).toEqual([]);
  });

  test('write + read round-trip', () => {
    const store = createTodoStore();
    const sid = uuidv4();
    const todos = [fakeTodo(sid, 'a'), fakeTodo(sid, 'b')];
    store.write(sid, todos);
    expect(store.read(sid)).toEqual(todos);
  });

  test('write overwrites previous list (idempotent semantics)', () => {
    const store = createTodoStore();
    const sid = uuidv4();
    store.write(sid, [fakeTodo(sid, 'a')]);
    store.write(sid, [fakeTodo(sid, 'b'), fakeTodo(sid, 'c')]);
    expect(store.read(sid).map((t) => t.content)).toEqual(['b', 'c']);
  });

  test('writes for different sessions stay isolated', () => {
    const store = createTodoStore();
    const s1 = uuidv4();
    const s2 = uuidv4();
    store.write(s1, [fakeTodo(s1, 'a')]);
    store.write(s2, [fakeTodo(s2, 'b'), fakeTodo(s2, 'c')]);
    expect(store.read(s1)).toHaveLength(1);
    expect(store.read(s2)).toHaveLength(2);
  });

  test('subscribers are notified on write with the new list', () => {
    const store = createTodoStore();
    const sid = uuidv4();
    const events: Array<{ sessionId: string; count: number }> = [];
    const unsub = store.subscribe((s, todos) => events.push({ sessionId: s, count: todos.length }));
    store.write(sid, [fakeTodo(sid, 'a')]);
    store.write(sid, [fakeTodo(sid, 'a'), fakeTodo(sid, 'b')]);
    unsub();
    store.write(sid, []); // after unsub — should not fire
    expect(events).toEqual([
      { sessionId: sid, count: 1 },
      { sessionId: sid, count: 2 },
    ]);
  });
});

describe('buildTodoTools', () => {
  function setup() {
    const store = createTodoStore();
    const sid = uuidv4();
    let changeNotifications = 0;
    const tools = buildTodoTools({
      store,
      sessionId: sid,
      onChange: () => {
        changeNotifications++;
      },
    });
    return { store, sid, tools, changeCount: () => changeNotifications };
  }

  test('todoWrite replaces the list, returns counts and triggers onChange', async () => {
    const { tools, store, sid, changeCount } = setup();
    const r = await exec(tools.todoWrite, {
      todos: [
        { id: 'a', content: 'Run tests', status: 'in_progress', priority: 'high' },
        { id: 'b', content: 'Ship feature', status: 'pending', priority: 'medium' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.count).toBe(2);
    expect(r.counts).toEqual({ in_progress: 1, pending: 1 });
    expect(store.read(sid)).toHaveLength(2);
    expect(changeCount()).toBe(1);
  });

  test('todoWrite is idempotent (second call overwrites)', async () => {
    const { tools, store, sid } = setup();
    await exec(tools.todoWrite, {
      todos: [{ id: 'a', content: 'first', status: 'pending', priority: 'low' }],
    });
    await exec(tools.todoWrite, {
      todos: [{ id: 'b', content: 'second', status: 'pending', priority: 'low' }],
    });
    const list = store.read(sid);
    expect(list).toHaveLength(1);
    expect(list[0]?.content).toBe('second');
  });

  test('todoRead returns the current list', async () => {
    const { tools, sid, store } = setup();
    store.write(sid, [
      createTodo({
        sessionId: sid,
        content: 'x',
        status: TodoStatus.PENDING,
        priority: TodoPriority.LOW,
      }),
    ]);
    const r = await exec(tools.todoRead, {});
    expect(r.count).toBe(1);
    expect(r.todos[0]?.content).toBe('x');
  });

  test('todoRead returns empty when nothing has been written', async () => {
    const { tools } = setup();
    const r = await exec(tools.todoRead, {});
    expect(r.count).toBe(0);
    expect(r.todos).toEqual([]);
  });
});
