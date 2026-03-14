import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TodoPart } from '../src/qwery/ai/message-parts';
import { ToolVariantProvider } from '../src/qwery/ai/tool-variant-context';
import * as scrollUtils from '../src/qwery/ai/utils/scroll-utils';
import * as sonner from 'sonner';

vi.mock('../src/qwery/ai/utils/scroll-utils');
vi.mock('sonner');

function renderTodoPart(part: Parameters<typeof TodoPart>[0]['part']) {
  return render(
    <ToolVariantProvider>
      <TodoPart part={part} messageId="msg-1" index={0} />
    </ToolVariantProvider>,
  );
}

describe('TodoPart feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows toast for pending task on click', () => {
    renderTodoPart({
      type: 'tool-todowrite',
      state: 'result',
      input: {
        todos: [{ id: 'task-1', content: 'Fetch schema', status: 'pending' }],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Fetch schema/i }));

    expect(sonner.toast.info).toHaveBeenCalledWith('Task not started yet');
    expect(scrollUtils.scrollToTodoDelimiter).not.toHaveBeenCalled();
  });

  it('shows toast for cancelled task on click', () => {
    renderTodoPart({
      type: 'tool-todowrite',
      state: 'result',
      input: {
        todos: [{ id: 'task-1', content: 'Fetch schema', status: 'cancelled' }],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Fetch schema/i }));

    expect(sonner.toast.info).toHaveBeenCalledWith('Task was cancelled');
    expect(scrollUtils.scrollToTodoDelimiter).not.toHaveBeenCalled();
  });

  it('calls scrollToTodoDelimiter for in_progress task', () => {
    vi.mocked(scrollUtils.scrollToTodoDelimiter).mockReturnValue(true);

    renderTodoPart({
      type: 'tool-todowrite',
      state: 'result',
      input: {
        todos: [
          { id: 'task-1', content: 'Fetch schema', status: 'in_progress' },
        ],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Fetch schema/i }));

    expect(scrollUtils.scrollToTodoDelimiter).toHaveBeenCalledWith('task-1', {
      behavior: 'smooth',
      block: 'center',
      scopeMessageId: 'msg-1',
    });
    expect(sonner.toast.info).not.toHaveBeenCalled();
  });

  it('shows toast when scroll fails for in_progress task', () => {
    vi.mocked(scrollUtils.scrollToTodoDelimiter).mockReturnValue(false);

    renderTodoPart({
      type: 'tool-todowrite',
      state: 'result',
      input: {
        todos: [
          { id: 'task-1', content: 'Fetch schema', status: 'in_progress' },
        ],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Fetch schema/i }));

    expect(sonner.toast.info).toHaveBeenCalledWith('Task output not found yet');
  });
});
