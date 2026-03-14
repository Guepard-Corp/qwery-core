import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskDelimiter } from '../src/qwery/ai/task-delimiter';
import * as scrollUtils from '../src/qwery/ai/utils/scroll-utils';
import * as sonner from 'sonner';

vi.mock('../src/qwery/ai/utils/scroll-utils');
vi.mock('sonner');

describe('TaskDelimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with task title', () => {
    render(
      <TaskDelimiter
        taskIndex={1}
        taskTitle="Fetch schema"
        todos={[
          {
            id: 'task-1',
            content: 'Fetch schema',
            status: 'in_progress',
            priority: 'HIGH',
          },
        ]}
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Fetch schema'),
    );
  });

  it('calls scrollToTodoTaskAndHighlight with scopeMessageId on click', () => {
    vi.mocked(scrollUtils.scrollToTodoTaskAndHighlight).mockReturnValue(true);

    render(
      <TaskDelimiter
        taskIndex={1}
        taskTitle="Fetch schema"
        todos={[
          {
            id: 'task-1',
            content: 'Fetch schema',
            status: 'in_progress',
            priority: 'HIGH',
          },
        ]}
        messageId="msg-123"
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(scrollUtils.scrollToTodoTaskAndHighlight).toHaveBeenCalledWith(
      'task-1',
      {
        behavior: 'smooth',
        block: 'center',
        highlightDuration: 2000,
        scopeMessageId: 'msg-123',
      },
    );
  });

  it('shows toast when scroll returns false', () => {
    vi.mocked(scrollUtils.scrollToTodoTaskAndHighlight).mockReturnValue(false);

    render(
      <TaskDelimiter
        taskIndex={1}
        taskTitle="Fetch schema"
        todos={[
          {
            id: 'task-1',
            content: 'Fetch schema',
            status: 'in_progress',
            priority: 'HIGH',
          },
        ]}
        messageId="msg-123"
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(sonner.toast.info).toHaveBeenCalledWith('Task not found in list');
  });
});
