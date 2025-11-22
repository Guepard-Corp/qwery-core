import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
} from '../../ai-elements/task';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '../../ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '../../ai-elements/reasoning';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '../../ai-elements/tool';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../../ai-elements/sources';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import { ToolUIPart } from 'ai';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'error';

export type TaskUIPart = {
  type: 'data-tasks';
  id: string;
  data: {
    title: string;
    subtitle?: string;
    tasks: {
      id: string;
      label: string;
      description?: string;
      status: TaskStatus;
    }[];
  };
};

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: 'Queued',
    badgeClass: 'bg-secondary text-foreground',
  },
  'in-progress': {
    label: 'Running',
    badgeClass: 'bg-primary/10 text-primary',
  },
  completed: {
    label: 'Done',
    badgeClass: 'bg-emerald-500/15 text-emerald-600',
  },
  error: {
    label: 'Error',
    badgeClass: 'bg-destructive/10 text-destructive',
  },
};

export interface TaskPartProps {
  part: TaskUIPart;
  messageId: string;
  index: number;
}

export function TaskPart({ part, messageId, index }: TaskPartProps) {
  return (
    <Task
      key={`${messageId}-${part.id}-${index}`}
      className="border-border bg-background/60 w-full border"
    >
      <TaskTrigger title={part.data.title} />
      <TaskContent>
        {part.data.subtitle ? (
          <p className="text-muted-foreground text-xs">{part.data.subtitle}</p>
        ) : null}
        {part.data.tasks.map((task) => {
          const meta = TASK_STATUS_META[task.status];
          return (
            <TaskItem
              key={task.id}
              className="text-foreground flex flex-col gap-1 text-sm"
            >
              <div className="flex items-center gap-2">
                <TaskItemFile className={meta.badgeClass}>
                  {meta.label}
                </TaskItemFile>
                <span>{task.label}</span>
              </div>
              {task.description ? (
                <p className="text-muted-foreground text-xs">
                  {task.description}
                </p>
              ) : null}
            </TaskItem>
          );
        })}
      </TaskContent>
    </Task>
  );
}

export interface TextPartProps {
  part: { type: 'text'; text: string };
  messageId: string;
  messageRole: 'user' | 'assistant' | 'system';
  index: number;
  isLastMessage: boolean;
  onRegenerate?: () => void;
}

export function TextPart({
  part,
  messageId,
  messageRole,
  index,
  isLastMessage,
  onRegenerate,
}: TextPartProps) {
  return (
    <Message key={`${messageId}-${index}`} from={messageRole}>
      <MessageContent>
        <MessageResponse>{part.text}</MessageResponse>
      </MessageContent>
      {messageRole === 'assistant' && isLastMessage && (
        <MessageActions>
          {onRegenerate && (
            <MessageAction onClick={onRegenerate} label="Retry">
              <RefreshCcwIcon className="size-3" />
            </MessageAction>
          )}
          <MessageAction
            onClick={() => navigator.clipboard.writeText(part.text)}
            label="Copy"
          >
            <CopyIcon className="size-3" />
          </MessageAction>
        </MessageActions>
      )}
    </Message>
  );
}

export interface ReasoningPartProps {
  part: { type: 'reasoning'; text: string };
  messageId: string;
  index: number;
  isStreaming: boolean;
}

export function ReasoningPart({
  part,
  messageId,
  index,
  isStreaming,
}: ReasoningPartProps) {
  return (
    <Reasoning
      key={`${messageId}-${index}`}
      className="w-full"
      isStreaming={isStreaming}
    >
      <ReasoningTrigger />
      <ReasoningContent>{part.text}</ReasoningContent>
    </Reasoning>
  );
}

export interface ToolPartProps {
  part: ToolUIPart;
  messageId: string;
  index: number;
}

export function ToolPart({ part, messageId, index }: ToolPartProps) {
  const toolName = part.type.replace('tool-', '');

  return (
    <Tool
      key={`${messageId}-${index}`}
      defaultOpen={part.state === 'output-error'}
    >
      <ToolHeader title={toolName} type={part.type} state={part.state} />
      <ToolContent>
        {part.input != null ? <ToolInput input={part.input} /> : null}
        <ToolOutput output={part.output} errorText={part.errorText} />
      </ToolContent>
    </Tool>
  );
}

export interface SourcesPartProps {
  parts: Array<{ type: 'source-url'; sourceId: string; url?: string }>;
  messageId: string;
}

export function SourcesPart({ parts, messageId }: SourcesPartProps) {
  if (parts.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={parts.length} />
      {parts.map((part, i) => (
        <SourcesContent key={`${messageId}-${i}`}>
          <Source href={part.url} title={part.url} />
        </SourcesContent>
      ))}
    </Sources>
  );
}
