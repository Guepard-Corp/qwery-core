import { describe, expect, test } from 'bun:test';
import { randomUUID as uuidv4 } from 'node:crypto';
import { completeTask, createTask, failTask, TaskSchema, TaskState } from '../task.entity';

describe('createTask', () => {
  test('starts in the RUNNING state with an auto id prefixed task_', () => {
    const task = createTask({ subagent: 'sql-optimizer', prompt: 'optimize me' });
    expect(task.state).toBe(TaskState.RUNNING);
    expect(task.id.startsWith('task_')).toBe(true);
    expect(task.subagent).toBe('sql-optimizer');
    expect(task.prompt).toBe('optimize me');
    expect(task.startedAt).toBeInstanceOf(Date);
    expect(task.endedAt).toBeUndefined();
  });

  test('honors a provided id + sessionId', () => {
    const sid = uuidv4();
    const task = createTask({ id: 'task_custom', sessionId: sid, subagent: 'x', prompt: 'p' });
    expect(task.id).toBe('task_custom');
    expect(task.sessionId).toBe(sid);
  });

  test('rejects an empty subagent name', () => {
    expect(() => createTask({ subagent: '', prompt: 'p' })).toThrow();
  });
});

describe('completeTask', () => {
  test('moves to COMPLETED with text + usage and stamps endedAt', () => {
    const task = createTask({ subagent: 'x', prompt: 'p' });
    const done = completeTask(task, 'result', { inputTokens: 10, outputTokens: 5, totalTokens: 15 });
    expect(done.state).toBe(TaskState.COMPLETED);
    expect(done.text).toBe('result');
    expect(done.usage?.inputTokens).toBe(10);
    expect(done.usage?.outputTokens).toBe(5);
    expect(done.usage?.totalTokens).toBe(15);
    expect(done.endedAt).toBeInstanceOf(Date);
    // Original is not mutated.
    expect(task.state).toBe(TaskState.RUNNING);
  });

  test('usage is optional', () => {
    const task = createTask({ subagent: 'x', prompt: 'p' });
    const done = completeTask(task, 'result');
    expect(done.usage).toBeUndefined();
  });
});

describe('failTask', () => {
  test('moves to ERROR with the error message', () => {
    const task = createTask({ subagent: 'x', prompt: 'p' });
    const failed = failTask(task, 'boom');
    expect(failed.state).toBe(TaskState.ERROR);
    expect(failed.error).toBe('boom');
    expect(failed.endedAt).toBeInstanceOf(Date);
  });
});

describe('TaskSchema', () => {
  test('rejects unknown state values', () => {
    expect(() =>
      TaskSchema.parse({
        id: 'task_x',
        subagent: 'x',
        prompt: 'p',
        state: 'paused',
        startedAt: new Date(),
      }),
    ).toThrow();
  });
});
