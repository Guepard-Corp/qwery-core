import type { ComponentType } from 'react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { scrollToTodoTaskAndHighlight } from './utils/scroll-utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../shadcn/hover-card';
import {
  CheckCircle2Icon,
  ArrowRightIcon,
  CircleDashedIcon,
  ListTodo,
} from 'lucide-react';
import type { ParsedTodo } from './utils/todo-logic';

const STATUS_ICON: Record<
  ParsedTodo['status'],
  ComponentType<{ className?: string }>
> = {
  pending: CircleDashedIcon,
  in_progress: ArrowRightIcon,
  completed: CheckCircle2Icon,
  cancelled: CircleDashedIcon,
};

function TodoProgressItem({
  todo,
  isInProgress,
}: {
  todo: ParsedTodo;
  isInProgress: boolean;
}) {
  const Icon = STATUS_ICON[todo.status];
  const isCompleted = todo.status === 'completed';
  const isCancelled = todo.status === 'cancelled';

  return (
    <li
      className={cn(
        'flex items-start gap-2 py-1.5 text-sm',
        (isCompleted || isCancelled) && 'text-muted-foreground',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center',
          isCompleted && 'text-emerald-600 dark:text-emerald-400',
          isInProgress && 'text-primary',
        )}
      >
        <Icon
          className={cn(
            'size-4',
            isInProgress && 'animate-pulse',
            (isCompleted || isCancelled) && 'opacity-70',
          )}
        />
      </div>
      <span
        className={cn(
          'min-w-0 flex-1 break-words',
          (isCompleted || isCancelled) && 'line-through',
          isInProgress && 'font-medium',
        )}
      >
        {todo.content || 'Task'}
      </span>
    </li>
  );
}

export interface TaskDelimiterProps {
  taskIndex: number;
  taskTitle: string;
  todos: ParsedTodo[];
  status?: 'started' | 'completed' | 'failed' | 'retry';
  className?: string;
  messageId?: string;
}

export function TaskDelimiter({
  taskIndex,
  taskTitle,
  todos,
  className,
  messageId,
}: TaskDelimiterProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const inProgressTask = todos.find((t) => t.status === 'in_progress');
  const displayTask = inProgressTask ?? todos[taskIndex - 1];
  const StatusIcon =
    displayTask?.status === 'completed' ? CheckCircle2Icon : ArrowRightIcon;

  const taskId = displayTask?.id;

  const handleClick = () => {
    setHoverOpen(false);
    if (!taskId) return;
    const found = scrollToTodoTaskAndHighlight(taskId, {
      behavior: 'smooth',
      block: 'center',
      highlightDuration: 2000,
      scopeMessageId: messageId,
    });
    if (!found) {
      toast.info('Task not found in list');
    }
  };

  return (
    <div
      {...(taskId ? { 'data-todo-delimiter-task-id': taskId } : {})}
      className="w-full"
    >
      <HoverCard
        open={hoverOpen}
        onOpenChange={setHoverOpen}
        openDelay={200}
        closeDelay={100}
      >
        <HoverCardTrigger asChild>
          <button
            type="button"
            aria-label={`Task ${taskIndex}: ${taskTitle} — hover for full plan, click to scroll to task`}
            onClick={handleClick}
            className={cn(
              'text-muted-foreground hover:text-foreground flex max-w-full min-w-0 cursor-pointer items-center gap-1 overflow-hidden py-2 text-xs transition-colors',
              className,
            )}
            data-component="task-delimiter"
          >
            <ListTodo className="size-3.5 shrink-0" />
            <span className="shrink-0">Started to-do</span>
            {displayTask && (
              <span className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
                <StatusIcon
                  className={cn(
                    'size-3 shrink-0',
                    displayTask.status === 'completed'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-primary animate-pulse',
                  )}
                />
                <span className="min-w-0 truncate">{displayTask.content}</span>
              </span>
            )}
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-96 max-w-[min(90vw,28rem)] p-3"
          sideOffset={6}
        >
          <ul className="flex flex-col gap-0">
            {todos.map((todo) => (
              <TodoProgressItem
                key={todo.id}
                todo={todo}
                isInProgress={todo.status === 'in_progress'}
              />
            ))}
          </ul>
          {todos.length > 0 &&
            todos.every(
              (t) => t.status === 'completed' || t.status === 'cancelled',
            ) && (
              <p className="text-muted-foreground mt-2 border-t pt-2 text-sm">
                Completed {todos.filter((t) => t.status === 'completed').length}{' '}
                of {todos.length}
              </p>
            )}
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
