import { describe, expect, test } from 'bun:test';
import { randomUUID as uuidv4 } from 'node:crypto';
import { createTodo, TodoPriority, TodoSchema, TodoStatus, updateTodo } from '../todo.entity';

const SESSION = uuidv4();

describe('createTodo', () => {
  test('auto-generates an id when omitted', () => {
    const todo = createTodo({
      sessionId: SESSION,
      content: 'do thing',
      status: TodoStatus.PENDING,
      priority: TodoPriority.MEDIUM,
    });
    expect(todo.id).toBeDefined();
    expect(todo.id.length).toBeGreaterThan(0);
    expect(todo.sessionId).toBe(SESSION);
    expect(todo.content).toBe('do thing');
    expect(todo.status).toBe(TodoStatus.PENDING);
    expect(todo.priority).toBe(TodoPriority.MEDIUM);
    expect(todo.createdAt).toBeInstanceOf(Date);
    expect(todo.updatedAt).toBeInstanceOf(Date);
  });

  test('uses the provided id verbatim', () => {
    const todo = createTodo({
      id: 'my-stable-id',
      sessionId: SESSION,
      content: 'x',
      status: TodoStatus.PENDING,
      priority: TodoPriority.LOW,
    });
    expect(todo.id).toBe('my-stable-id');
  });

  test('rejects empty content via the schema', () => {
    expect(() =>
      createTodo({
        sessionId: SESSION,
        content: '',
        status: TodoStatus.PENDING,
        priority: TodoPriority.LOW,
      }),
    ).toThrow();
  });

  test('rejects an invalid status', () => {
    expect(() =>
      TodoSchema.parse({
        id: 'x',
        sessionId: SESSION,
        content: 'x',
        status: 'not-a-real-status',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });
});

describe('updateTodo', () => {
  function seed() {
    return createTodo({
      sessionId: SESSION,
      content: 'old',
      status: TodoStatus.PENDING,
      priority: TodoPriority.LOW,
    });
  }

  test('content is replaceable', () => {
    const todo = seed();
    const updated = updateTodo(todo, { content: 'new' });
    expect(updated.content).toBe('new');
    expect(updated.id).toBe(todo.id);
    expect(updated.createdAt).toEqual(todo.createdAt);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(todo.updatedAt.getTime());
  });

  test('status transitions persist', () => {
    const todo = seed();
    const inProgress = updateTodo(todo, { status: TodoStatus.IN_PROGRESS });
    expect(inProgress.status).toBe(TodoStatus.IN_PROGRESS);
    const done = updateTodo(inProgress, { status: TodoStatus.COMPLETED });
    expect(done.status).toBe(TodoStatus.COMPLETED);
  });

  test('omitted fields are preserved', () => {
    const todo = seed();
    const updated = updateTodo(todo, {});
    expect(updated.content).toBe(todo.content);
    expect(updated.status).toBe(todo.status);
    expect(updated.priority).toBe(todo.priority);
  });
});
