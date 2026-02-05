'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../shadcn/collapsible';
import { cn } from '../lib/utils';
import { ChevronDownIcon, ListTodo } from 'lucide-react';
import type { ComponentProps } from 'react';

export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'error';

const TASK_INDICATOR_CLASS: Record<TaskStatus, string> = {
  pending: 'border-muted-foreground/50 bg-transparent',
  'in-progress': 'border-primary/60 bg-primary/20',
  completed: 'border-emerald-500/50 bg-emerald-500/20',
  error: 'border-destructive/50 bg-destructive/20',
};

const TASK_INDICATOR_DOT: Record<TaskStatus, string> = {
  pending: 'bg-muted-foreground/30',
  'in-progress': 'bg-primary animate-pulse',
  completed: 'bg-emerald-600',
  error: 'bg-destructive',
};

export type TaskItemIndicatorProps = ComponentProps<'span'> & {
  status: TaskStatus;
};

export const TaskItemIndicator = ({
  status,
  className,
  ...props
}: TaskItemIndicatorProps) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center rounded-full border',
      TASK_INDICATOR_CLASS[status],
      className,
    )}
    aria-hidden
    {...props}
  >
    <span
      className={cn(
        'size-1.5 rounded-full',
        TASK_INDICATOR_DOT[status],
      )}
    />
  </span>
);

export type TaskItemFileProps = ComponentProps<'div'>;

export const TaskItemFile = ({
  children,
  className,
  ...props
}: TaskItemFileProps) => (
  <div
    className={cn(
      'bg-secondary text-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type TaskItemProps = ComponentProps<'div'>;

export const TaskItem = ({ children, className, ...props }: TaskItemProps) => (
  <div className={cn('text-muted-foreground text-sm', className)} {...props}>
    {children}
  </div>
);

export type TaskProps = ComponentProps<typeof Collapsible>;

export const Task = ({
  defaultOpen = true,
  className,
  ...props
}: TaskProps) => (
  <Collapsible className={cn(className)} defaultOpen={defaultOpen} {...props} />
);

export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title: string;
};

export const TaskTrigger = ({
  children,
  className,
  title,
  ...props
}: TaskTriggerProps) => (
  <CollapsibleTrigger asChild className={cn('group', className)} {...props}>
    {children ?? (
      <div className="text-muted-foreground hover:text-foreground flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-muted/50">
        <ListTodo className="size-4 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <span className="inline-flex size-4 shrink-0 items-center justify-center">
          <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
        </span>
      </div>
    )}
  </CollapsibleTrigger>
);

export type TaskContentProps = ComponentProps<typeof CollapsibleContent>;

export const TaskContent = ({
  children,
  className,
  ...props
}: TaskContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in outline-none',
      className,
    )}
    {...props}
  >
    <div className="mt-2 space-y-0.5 pl-1">
      {children}
    </div>
  </CollapsibleContent>
);
