import { describe, expect, test } from 'bun:test';
import { TaskState } from '@qwery/domain';
import { createBackgroundJobRegistry } from '../background-jobs';

describe('BackgroundJobRegistry', () => {
  test('create returns a RUNNING task with a fresh id', () => {
    const r = createBackgroundJobRegistry();
    const job = r.create({ subagent: 'x', prompt: 'p' });
    expect(job.state).toBe(TaskState.RUNNING);
    expect(job.id.startsWith('task_')).toBe(true);
    expect(r.get(job.id)).toEqual(job);
  });

  test('honors a custom id on create', () => {
    const r = createBackgroundJobRegistry();
    const job = r.create({ id: 'task_explicit', subagent: 'x', prompt: 'p' });
    expect(job.id).toBe('task_explicit');
    expect(r.get('task_explicit')).toBeDefined();
  });

  test('get returns undefined for unknown ids', () => {
    const r = createBackgroundJobRegistry();
    expect(r.get('nope')).toBeUndefined();
  });

  test('complete transitions RUNNING → COMPLETED with text + usage', () => {
    const r = createBackgroundJobRegistry();
    const job = r.create({ subagent: 'x', prompt: 'p' });
    r.complete(job.id, 'result', { inputTokens: 1, outputTokens: 2, totalTokens: 3 });
    const updated = r.get(job.id)!;
    expect(updated.state).toBe(TaskState.COMPLETED);
    expect(updated.text).toBe('result');
    expect(updated.usage?.inputTokens).toBe(1);
    expect(updated.endedAt).toBeInstanceOf(Date);
  });

  test('fail transitions RUNNING → ERROR with the message', () => {
    const r = createBackgroundJobRegistry();
    const job = r.create({ subagent: 'x', prompt: 'p' });
    r.fail(job.id, 'boom');
    const updated = r.get(job.id)!;
    expect(updated.state).toBe(TaskState.ERROR);
    expect(updated.error).toBe('boom');
    expect(updated.endedAt).toBeInstanceOf(Date);
  });

  test('complete/fail on unknown id is a no-op (does not throw)', () => {
    const r = createBackgroundJobRegistry();
    expect(() => r.complete('nope', 'x')).not.toThrow();
    expect(() => r.fail('nope', 'x')).not.toThrow();
  });

  test('list returns jobs sorted by most recent start', async () => {
    const r = createBackgroundJobRegistry();
    const a = r.create({ subagent: 'a', prompt: 'p' });
    // Force a tick so the second job has a later startedAt.
    await new Promise((res) => setTimeout(res, 2));
    const b = r.create({ subagent: 'b', prompt: 'p' });
    const list = r.list();
    expect(list[0]!.id).toBe(b.id);
    expect(list[1]!.id).toBe(a.id);
  });
});
