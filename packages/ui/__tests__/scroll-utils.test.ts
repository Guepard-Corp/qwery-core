import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  scrollToTodoDelimiter,
  scrollToTodoTaskAndHighlight,
} from '../src/qwery/ai/utils/scroll-utils';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('scrollToTodoDelimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when delimiter found within scope', () => {
    const msg = document.createElement('div');
    msg.setAttribute('data-message-id', 'msg-1');
    const delimiter = document.createElement('div');
    delimiter.setAttribute('data-todo-delimiter-task-id', 'task-1');
    msg.appendChild(delimiter);
    document.body.appendChild(msg);

    const result = scrollToTodoDelimiter('task-1', {
      scopeMessageId: 'msg-1',
      behavior: 'auto',
    });

    expect(result).toBe(true);
  });

  it('returns false when delimiter not in scope', () => {
    const msg1 = document.createElement('div');
    msg1.setAttribute('data-message-id', 'msg-1');
    document.body.appendChild(msg1);

    const msg2 = document.createElement('div');
    msg2.setAttribute('data-message-id', 'msg-2');
    const delimiter = document.createElement('div');
    delimiter.setAttribute('data-todo-delimiter-task-id', 'task-1');
    msg2.appendChild(delimiter);
    document.body.appendChild(msg2);

    const result = scrollToTodoDelimiter('task-1', {
      scopeMessageId: 'msg-1',
      behavior: 'auto',
    });

    expect(result).toBe(false);
  });

  it('returns false when element does not exist', () => {
    const msg = document.createElement('div');
    msg.setAttribute('data-message-id', 'msg-1');
    document.body.appendChild(msg);

    const result = scrollToTodoDelimiter('task-1', {
      scopeMessageId: 'msg-1',
      behavior: 'auto',
    });

    expect(result).toBe(false);
  });
});

describe('scrollToTodoTaskAndHighlight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when task found within scope', () => {
    const msg = document.createElement('div');
    msg.setAttribute('data-message-id', 'msg-1');
    const task = document.createElement('li');
    task.setAttribute('data-todo-task-id', 'task-1');
    msg.appendChild(task);
    document.body.appendChild(msg);

    const result = scrollToTodoTaskAndHighlight('task-1', {
      scopeMessageId: 'msg-1',
      behavior: 'auto',
    });

    expect(result).toBe(true);
  });

  it('returns false when task not in scope', () => {
    const msg1 = document.createElement('div');
    msg1.setAttribute('data-message-id', 'msg-1');
    document.body.appendChild(msg1);

    const msg2 = document.createElement('div');
    msg2.setAttribute('data-message-id', 'msg-2');
    const task = document.createElement('li');
    task.setAttribute('data-todo-task-id', 'task-1');
    msg2.appendChild(task);
    document.body.appendChild(msg2);

    const result = scrollToTodoTaskAndHighlight('task-1', {
      scopeMessageId: 'msg-1',
      behavior: 'auto',
    });

    expect(result).toBe(false);
  });
});
