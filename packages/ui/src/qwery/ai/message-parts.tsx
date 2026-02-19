import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemIndicator,
  TaskTrigger,
} from '../../ai-elements/task';
import {
  Message,
  MessageContent,
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
import { CodeBlock } from '../../ai-elements/code-block';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { SQLQueryVisualizer } from './sql-query-visualizer';

import type { DatasourceMetadata } from '@qwery/domain/entities';
import { cn } from '../../lib/utils';
import { SchemaVisualizer } from './schema-visualizer';
import { Trans } from '../trans';
import { TOOL_UI_CONFIG } from './utils/tool-ui-config';

import { ViewSheetVisualizer } from './sheets/view-sheet-visualizer';

import { ViewSheetError } from './sheets/view-sheet-error';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../../ai-elements/sources';
import { useState, createContext, useMemo, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

function RunQueriesOpenSync({
  runQueriesAllOpen,
  runQueriesInputLength,
  resultsLength,
  setOpenQueries,
}: {
  runQueriesAllOpen: boolean | null;
  runQueriesInputLength: number | undefined;
  resultsLength: number;
  setOpenQueries: Dispatch<SetStateAction<Set<number>>>;
}) {
  useEffect(() => {
    if (runQueriesAllOpen === null) return;
    const totalQueries = runQueriesInputLength ?? resultsLength;
    if (runQueriesAllOpen === true) {
      setOpenQueries(
        new Set(Array.from({ length: totalQueries }, (_, i) => i)),
      );
    } else {
      setOpenQueries(new Set());
    }
  }, [runQueriesAllOpen, runQueriesInputLength, resultsLength, setOpenQueries]);
  return null;
}
import {
  CopyIcon,
  RefreshCcwIcon,
  CheckIcon,
  Database,
  ListTodo,
  ChevronDownIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  XCircleIcon,
  ArrowRightIcon,
  ChevronsUpDown,
} from 'lucide-react';
import { ToolUIPart, UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { agentMarkdownComponents, HeadingContext } from './markdown-components';
import { ToolErrorVisualizer } from './tool-error-visualizer';
import type { useChat } from '@ai-sdk/react';
import { getUserFriendlyToolName } from './utils/tool-name';
import { useToolVariant } from './tool-variant-context';

import { ChartRenderer, type ChartConfig } from './charts/chart-renderer';
import {
  ChartSkeleton,
  TableResultsSkeleton,
  SchemaSkeleton,
  SheetSkeleton,
  SelectChartTypeSkeleton,
  GenericToolSkeleton,
} from './tool-loading-skeletons';
import {
  ChartTypeSelector,
  type ChartTypeSelection,
} from './charts/chart-type-selector';
import type { NotebookCellType } from './utils/notebook-cell-type';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'error';

export type TaskSubstep = {
  id: string;
  label: string;
  description?: string;
  status: TaskStatus;
};

export interface MarkdownContextValue {
  sendMessage?: ReturnType<typeof useChat>['sendMessage'];
  messages?: UIMessage[];
  currentMessageId?: string;
  onDatasourceNameClick?: (id: string, name: string) => void;
  getDatasourceTooltip?: (id: string) => string;
}

export const MarkdownContext = createContext<MarkdownContextValue>({});

export const MarkdownProvider = MarkdownContext.Provider;

export type TaskStep = {
  id: string;
  label: string;
  description?: string;
  status: TaskStatus;
  substeps?: TaskSubstep[];
};

export type TaskUIPart = {
  type: 'data-tasks';
  id: string;
  data: {
    title: string;
    subtitle?: string;
    tasks: TaskStep[];
  };
};

export interface TaskPartProps {
  part: TaskUIPart;
  messageId: string;
  index: number;
}

function TaskStepRow({
  task,
  isSubstep,
}: {
  task: TaskStep | TaskSubstep;
  isSubstep?: boolean;
}) {
  return (
    <>
      <TaskItem
        className={cn(
          'text-foreground flex items-start gap-3 rounded-md py-1.5 pr-2 text-sm',
          isSubstep && 'pl-2',
        )}
      >
        <TaskItemIndicator
          status={task.status}
          className={cn('mt-0.5 shrink-0', isSubstep ? 'size-3' : 'size-4')}
        />
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              task.status === 'completed' &&
                'text-muted-foreground line-through',
              task.status === 'error' && 'text-destructive',
              isSubstep && 'text-xs',
            )}
          >
            {task.label}
          </span>
          {task.description ? (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {task.description}
            </p>
          ) : null}
        </div>
      </TaskItem>
      {'substeps' in task && task.substeps && task.substeps.length > 0 && (
        <ul
          className="border-muted/50 flex flex-col gap-0.5 border-l pl-3"
          role="list"
        >
          {task.substeps.map((sub) => (
            <li key={sub.id}>
              <TaskStepRow task={sub} isSubstep />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function TaskPart({ part, messageId, index }: TaskPartProps) {
  return (
    <Task
      key={`${messageId}-${part.id}-${index}`}
      className="bg-muted/30 border-border/60 w-full rounded-lg border px-2 py-1"
    >
      <TaskTrigger title={part.data.title} />
      <TaskContent>
        {part.data.subtitle ? (
          <p className="text-muted-foreground mb-2 text-xs">
            {part.data.subtitle}
          </p>
        ) : null}
        <ul className="flex flex-col gap-0.5" role="list">
          {part.data.tasks.map((task) => (
            <li key={task.id}>
              <TaskStepRow task={task} />
            </li>
          ))}
        </ul>
      </TaskContent>
    </Task>
  );
}

export interface StartedStepIndicatorProps {
  stepIndex: number;
  stepLabel?: string;
}

export function StartedStepIndicator({
  stepIndex,
  stepLabel,
}: StartedStepIndicatorProps) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <CircleDashedIcon className="h-3.5 w-3.5 animate-spin" />
      <span>
        Step {stepIndex}
        {stepLabel ? `: ${stepLabel}` : ''}
      </span>
    </div>
  );
}

export interface TextPartProps {
  part: { type: 'text'; text: string };
  messageId: string;
  messageRole: 'user' | 'assistant' | 'system';
  index: number;
  isLastMessage: boolean;
  onRegenerate?: () => void;
  sendMessage?: ReturnType<typeof useChat>['sendMessage'];
  messages?: UIMessage[];
  onDatasourceNameClick?: (id: string, name: string) => void;
  getDatasourceTooltip?: (id: string) => string;
}

export function TextPart({
  part,
  messageId,
  messageRole,
  index,
  isLastMessage,
  onRegenerate,
  sendMessage,
  messages,
  onDatasourceNameClick,
  getDatasourceTooltip,
}: TextPartProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [currentHeading, setCurrentHeading] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(part.text);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const headingContextValue = useMemo(
    () => ({
      currentHeading,
      setCurrentHeading,
    }),
    [currentHeading],
  );

  return (
    <MarkdownProvider
      value={{
        sendMessage,
        messages,
        currentMessageId: messageId,
        onDatasourceNameClick,
        getDatasourceTooltip,
      }}
    >
      <HeadingContext.Provider value={headingContextValue}>
        <Message
          key={`${messageId}-${index}`}
          from={messageRole}
          className={cn(
            messageRole === 'assistant' ? 'mt-4' : undefined,
            messageRole === 'assistant' && 'mx-4 pr-2 sm:mx-6 sm:pr-4',
          )}
        >
          <MessageContent>
            <div className="prose prose-base dark:prose-invert overflow-wrap-anywhere max-w-none min-w-0 overflow-x-hidden break-words [&_code]:break-words [&_div[data-code-block-container]]:w-full [&_div[data-code-block-container]]:max-w-[28rem] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&>*]:max-w-full [&>*]:min-w-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={agentMarkdownComponents}
              >
                {part.text}
              </ReactMarkdown>
            </div>
          </MessageContent>
          {messageRole === 'assistant' && isLastMessage && (
            <MessageActions>
              {onRegenerate && (
                <MessageAction onClick={onRegenerate} label="Retry">
                  <RefreshCcwIcon className="size-3" />
                </MessageAction>
              )}
              <MessageAction
                onClick={handleCopy}
                label={isCopied ? 'Copied!' : 'Copy'}
              >
                {isCopied ? (
                  <CheckIcon className="size-3 text-green-600" />
                ) : (
                  <CopyIcon className="size-3" />
                )}
              </MessageAction>
            </MessageActions>
          )}
        </Message>
      </HeadingContext.Provider>
    </MarkdownProvider>
  );
}

export interface ReasoningPartProps {
  part: { type: 'reasoning'; text: string };
  messageId: string;
  index: number;
  isStreaming: boolean;
  sendMessage?: ReturnType<typeof useChat>['sendMessage'];
  messages?: UIMessage[];
  onDatasourceNameClick?: (id: string, name: string) => void;
  getDatasourceTooltip?: (id: string) => string;
}

export function ReasoningPart({
  part,
  messageId,
  index,
  isStreaming,
  sendMessage,
  messages,
  onDatasourceNameClick,
  getDatasourceTooltip,
}: ReasoningPartProps) {
  const [currentHeading, setCurrentHeading] = useState('');

  const headingContextValue = useMemo(
    () => ({
      currentHeading,
      setCurrentHeading,
    }),
    [currentHeading],
  );

  return (
    <MarkdownProvider
      value={{
        sendMessage,
        messages,
        currentMessageId: messageId,
        onDatasourceNameClick,
        getDatasourceTooltip,
      }}
    >
      <HeadingContext.Provider value={headingContextValue}>
        <Reasoning
          key={`${messageId}-${index}`}
          className="w-full"
          isStreaming={isStreaming}
        >
          <ReasoningTrigger />
          <ReasoningContent>
            <div className="prose prose-base dark:prose-invert overflow-wrap-anywhere [&_p]:text-foreground/90 [&_li]:text-foreground/90 [&_strong]:text-foreground [&_em]:text-foreground/80 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-primary max-w-none min-w-0 overflow-x-hidden break-words [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&>*]:max-w-full [&>*]:min-w-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={agentMarkdownComponents}
              >
                {part.text}
              </ReactMarkdown>
            </div>
          </ReasoningContent>
        </Reasoning>
      </HeadingContext.Provider>
    </MarkdownProvider>
  );
}

export type TodoItemUI = {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: string;
};

const TODO_STATUS_META: Record<
  TodoItemUI['status'],
  {
    label: string;
    badgeClass: string;
    iconClass: string;
    Icon: React.ComponentType<{ className?: string }>;
    strikethrough: boolean;
  }
> = {
  pending: {
    label: 'Queued',
    badgeClass: 'bg-muted/50 text-muted-foreground',
    iconClass: 'text-muted-foreground',
    Icon: CircleDashedIcon,
    strikethrough: false,
  },
  in_progress: {
    label: 'Running',
    badgeClass: 'bg-primary/10 text-primary',
    iconClass: 'text-primary',
    Icon: ArrowRightIcon,
    strikethrough: false,
  },
  completed: {
    label: 'Done',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    Icon: CheckCircle2Icon,
    strikethrough: true,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-destructive/10 text-destructive',
    iconClass: 'text-destructive',
    Icon: XCircleIcon,
    strikethrough: true,
  },
};

const DEFAULT_TODO_STATUS: TodoItemUI['status'] = 'pending';

function getTodoStatusMeta(
  status: string | undefined,
): (typeof TODO_STATUS_META)[TodoItemUI['status']] {
  const normalized =
    status === 'in-progress'
      ? 'in_progress'
      : (status as TodoItemUI['status'] | undefined);
  return (
    (normalized && TODO_STATUS_META[normalized]) ??
    TODO_STATUS_META[DEFAULT_TODO_STATUS]
  );
}

function parseTodosFromPart(
  part: ToolUIPart & { type: 'tool-todowrite' | 'tool-todoread' },
): TodoItemUI[] {
  if (part.type === 'tool-todowrite') {
    const input = part.input as { todos?: TodoItemUI[] } | null;
    const todos = input?.todos;
    return Array.isArray(todos) ? todos : [];
  }
  const output = part.output;
  if (output == null) return [];
  if (Array.isArray(output)) return output as TodoItemUI[];
  if (typeof output === 'string') {
    try {
      const parsed = JSON.parse(output) as TodoItemUI[] | unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (typeof output === 'object' && output !== null && 'todos' in output) {
    const todos = (output as { todos: TodoItemUI[] }).todos;
    return Array.isArray(todos) ? todos : [];
  }
  return [];
}

function todoPartTitle(
  part: ToolUIPart & { type: 'tool-todowrite' | 'tool-todoread' },
  todos: TodoItemUI[],
): string {
  if (part.type === 'tool-todoread') return 'Todo list';
  if (todos.length === 0) return 'Plan';
  const allPending = todos.every((t) => t.status === 'pending');
  const allCompleted = todos.every((t) => t.status === 'completed');
  if (allPending) return 'Creating plan';
  if (allCompleted) return 'Completing plan';
  return 'Updating plan';
}

function todoPartSubtitle(todos: TodoItemUI[]): string | null {
  if (todos.length === 0) return null;
  const completed = todos.filter((t) => t.status === 'completed').length;
  return `${completed} of ${todos.length} To-dos`;
}

export type TodoPartProps = {
  part: ToolUIPart & { type: 'tool-todowrite' | 'tool-todoread' };
  messageId: string;
  index: number;
};

export function TodoPart({ part, messageId, index }: TodoPartProps) {
  const todos = parseTodosFromPart(part);
  const title = todoPartTitle(part, todos);
  const subtitle = todoPartSubtitle(todos);
  const displayTitle = subtitle ?? title;

  return (
    <Task
      key={`${messageId}-todo-${index}`}
      className="group border-border bg-card hover:border-border/80 w-full rounded-xl border shadow-sm transition-colors"
    >
      <TaskTrigger title={displayTitle}>
        <div className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-2 py-2 pr-1.5 text-sm transition-colors">
          <div className="bg-primary/10 text-primary flex shrink-0 items-center justify-center rounded-md p-1.5">
            <ListTodo className="size-3.5" />
          </div>
          <span className="min-w-0 flex-1 font-medium">{displayTitle}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </TaskTrigger>
      <TaskContent>
        <div className="pl-3">
          {todos.length === 0 ? (
            <p className="text-muted-foreground text-xs">No items yet</p>
          ) : (
            <ul className="space-y-0.5" data-component="todos">
              {todos.map((todo) => {
                const meta = getTodoStatusMeta(todo.status);
                const StatusIcon = meta.Icon ?? CircleDashedIcon;
                return (
                  <li
                    key={todo.id}
                    className={cn(
                      'flex items-center gap-2 py-1.5 text-sm',
                      meta.strikethrough && 'text-muted-foreground',
                    )}
                    data-status={todo.status}
                  >
                    <div
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-full p-1',
                        meta.badgeClass,
                        meta.iconClass,
                      )}
                    >
                      <StatusIcon className="size-3" />
                    </div>
                    <span
                      className={cn(
                        'min-w-0 flex-1',
                        meta.strikethrough && 'line-through',
                      )}
                    >
                      {todo.content}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </TaskContent>
    </Task>
  );
}

export interface ToolPartProps {
  part: ToolUIPart;
  messageId: string;
  index: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpenWhenUncontrolled?: boolean;
  onViewSheet?: (sheetName: string) => void;
  onDeleteSheets?: (sheetNames: string[]) => void;
  onRenameSheet?: (oldSheetName: string, newSheetName: string) => void;
  isRequestInProgress?: boolean;
  onPasteToNotebook?: (
    sqlQuery: string,
    notebookCellType: NotebookCellType,
    datasourceId: string,
    cellId: number,
  ) => void;
  notebookContext?: {
    cellId?: number;
    notebookCellType?: NotebookCellType;
    datasourceId?: string;
  };
  pluginLogoMap?: Map<string, string>;
  selectedDatasourceItems?: Array<{
    id: string;
    slug: string;
    datasource_provider: string;
  }>;
  onToolApproval?: (approvalId: string, approved: boolean) => void;
}

export function ToolPart({
  part,
  messageId,
  index,
  open,
  onOpenChange,
  defaultOpenWhenUncontrolled,
  onPasteToNotebook,
  notebookContext,
  pluginLogoMap,
  selectedDatasourceItems,
}: ToolPartProps) {
  const { variant } = useToolVariant();
  const [runQueriesAllOpen, setRunQueriesAllOpen] = useState<boolean | null>(
    null,
  );
  const [openQueries, setOpenQueries] = useState<Set<number>>(new Set());

  let toolName: string;
  if (
    'toolName' in part &&
    typeof part.toolName === 'string' &&
    part.toolName
  ) {
    const rawName = part.toolName;
    toolName = rawName.startsWith('tool-')
      ? getUserFriendlyToolName(rawName)
      : getUserFriendlyToolName(`tool-${rawName}`);
  } else {
    toolName = getUserFriendlyToolName(part.type);
  }
  // Render specialized visualizers based on tool type
  const renderToolOutput = () => {
    const isMinimal = variant === 'minimal';
    // Handle runQueries errors - show batch summary above error
    if (
      part.type === 'tool-runQueries' &&
      part.state === 'output-error' &&
      part.errorText
    ) {
      const runQueriesInput = part.input as {
        queries?: Array<{ id?: string; query: string }>;
      } | null;
      return (
        <div className="space-y-3">
          {runQueriesInput?.queries && runQueriesInput.queries.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Batch Queries (failed)
              </p>
              <ul className="space-y-1 text-xs">
                {runQueriesInput.queries.map((q, idx) => (
                  <li key={q.id ?? idx} className="line-clamp-2 break-all">
                    {q.id ?? `#${idx + 1}`}: {q.query}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ToolErrorVisualizer errorText={part.errorText} />
        </div>
      );
    }

    // Handle runQuery errors - show query above error
    if (
      part.type === 'tool-runQuery' &&
      part.state === 'output-error' &&
      part.errorText
    ) {
      const input = part.input as { query?: string } | null;
      return (
        <div className="space-y-3">
          {input?.query && (
            <SQLQueryVisualizer query={input.query} result={undefined} />
          )}
          <ToolErrorVisualizer errorText={part.errorText} />
        </div>
      );
    }

    // Handle generateChart errors - show query above error
    if (
      part.type === 'tool-generateChart' &&
      part.state === 'output-error' &&
      part.errorText
    ) {
      const input = part.input as {
        queryResults?: { sqlQuery?: string };
      } | null;
      return (
        <div className="space-y-3">
          {input?.queryResults?.sqlQuery && (
            <SQLQueryVisualizer
              query={input.queryResults.sqlQuery}
              result={undefined}
            />
          )}
          <ToolErrorVisualizer errorText={part.errorText} />
        </div>
      );
    }

    // Handle selectChartType errors - show query above error
    if (
      part.type === 'tool-selectChartType' &&
      part.state === 'output-error' &&
      part.errorText
    ) {
      const input = part.input as {
        queryResults?: { sqlQuery?: string };
      } | null;
      return (
        <div className="space-y-3">
          {input?.queryResults?.sqlQuery && (
            <SQLQueryVisualizer
              query={input.queryResults.sqlQuery}
              result={undefined}
            />
          )}
          <ToolErrorVisualizer errorText={part.errorText} />
        </div>
      );
    }

    // Handle generateSql errors - show instruction above error
    if (
      part.type === 'tool-generateSql' &&
      part.state === 'output-error' &&
      part.errorText
    ) {
      const input = part.input as { instruction?: string } | null;
      return (
        <div className="space-y-3">
          {input?.instruction && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Instruction
              </p>
              <p className="text-sm">{input.instruction}</p>
            </div>
          )}
          <ToolErrorVisualizer errorText={part.errorText} />
        </div>
      );
    }

    // Handle getSchema errors - show view names above error
    if (
      part.type === 'tool-getSchema' &&
      part.state === 'output-error' &&
      part.errorText
    ) {
      const input = part.input as { viewNames?: string[] } | null;
      return (
        <div className="space-y-3">
          {input?.viewNames && input.viewNames.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Requested Views
              </p>
              <p className="text-sm">{input.viewNames.join(', ')}</p>
            </div>
          )}
          <ToolErrorVisualizer errorText={part.errorText} />
        </div>
      );
    }

    // Handle startWorkflow errors - show objective above error
    if (
      part.type === 'tool-startWorkflow' &&
      part.state === 'output-error' &&
      part.errorText
    ) {
      const input = part.input as { objective?: string } | null;
      return (
        <div className="space-y-3">
          {input?.objective && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Workflow Objective
              </p>
              <p className="text-sm">{input.objective}</p>
            </div>
          )}
          <ToolErrorVisualizer errorText={part.errorText} />
        </div>
      );
    }

    // Handle startWorkflow - streaming/loading, then result when output
    if (part.type === 'tool-startWorkflow') {
      const input = part.input as { objective?: string } | null;
      if (!part.output && part.input != null) {
        const isInputStreaming = part.state === 'input-streaming';
        return (
          <div className="flex w-full flex-col gap-3">
            {input?.objective && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                  Workflow Objective
                </p>
                <p className="text-sm">{input.objective}</p>
                {isInputStreaming && (
                  <span
                    className="text-foreground mt-1 inline-block h-4 w-0.5 shrink-0 animate-pulse rounded-sm bg-current align-middle"
                    aria-hidden
                  />
                )}
              </div>
            )}
            {!isInputStreaming && <GenericToolSkeleton />}
          </div>
        );
      }
    }

    // Generic error handler for other tools
    if (part.state === 'output-error' && part.errorText) {
      return <ToolErrorVisualizer errorText={part.errorText} />;
    }

    // Handle generateSql - streaming instruction or loading, then SQL when output
    if (part.type === 'tool-generateSql') {
      const input = part.input as { instruction?: string } | null;
      const output = part.output as { query?: string } | null;
      if (!part.output && input?.instruction) {
        const isInputStreaming = part.state === 'input-streaming';
        return (
          <div className="flex w-full flex-col gap-3">
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Instruction
              </p>
              <p className="text-sm">{input.instruction}</p>
              {isInputStreaming && (
                <span
                  className="text-foreground mt-1 inline-block h-4 w-0.5 shrink-0 animate-pulse rounded-sm bg-current align-middle"
                  aria-hidden
                />
              )}
            </div>
            {!isInputStreaming && <GenericToolSkeleton />}
          </div>
        );
      }
      if (part.output && output?.query) {
        return <SQLQueryVisualizer query={output.query} result={undefined} />;
      }
    }

    // Handle runQuery tool - show SQL query during streaming (from input) and results when available (from output)
    if (part.type === 'tool-runQuery') {
      const input = part.input as { query?: string } | null;
      const output = part.output as
        | {
            result?: {
              rows?: unknown[];
              columns?: unknown[];
              query?: string;
            };
            sqlQuery?: string;
            shouldPaste?: boolean;
            chartExecutionOverride?: boolean;
          }
        | null
        | undefined;

      // No output yet: show SQL streaming (cursor) or loading results
      if (!part.output && input?.query) {
        const isInputStreaming = part.state === 'input-streaming';
        return (
          <div className="flex w-full flex-col gap-3">
            <SQLQueryVisualizer
              query={input.query}
              result={undefined}
              onPasteToNotebook={undefined}
              showPasteButton={false}
              chartExecutionOverride={false}
              isStreaming={isInputStreaming}
            />
            {!isInputStreaming && <TableResultsSkeleton />}
          </div>
        );
      }

      if (!part.output) {
        return null;
      }

      // Check notebook context availability
      const _hasNotebookContext =
        notebookContext?.cellId !== undefined &&
        notebookContext?.notebookCellType &&
        notebookContext?.datasourceId;

      // Check notebook context availability for paste functionality

      // Show results if rows and columns are present (implies execution)
      const hasResults =
        output?.result?.rows &&
        Array.isArray(output.result.rows) &&
        output?.result?.columns &&
        Array.isArray(output.result.columns);

      // Extract SQL - check multiple possible locations
      // The tool returns { result: null, shouldPaste: true, sqlQuery: query }
      // But it might be serialized differently, so check all possibilities
      let sqlQuery: string | undefined = undefined;
      let shouldPaste: boolean = false;
      let chartExecutionOverride: boolean = false;

      // Check top-level output first (expected structure)
      if (output) {
        if ('sqlQuery' in output && typeof output.sqlQuery === 'string') {
          sqlQuery = output.sqlQuery;
        }
        if (
          'shouldPaste' in output &&
          typeof output.shouldPaste === 'boolean'
        ) {
          shouldPaste = output.shouldPaste;
        }
        if (
          'chartExecutionOverride' in output &&
          typeof output.chartExecutionOverride === 'boolean'
        ) {
          chartExecutionOverride = output.chartExecutionOverride;
        }
      }

      // Fallback to input.query if sqlQuery not found
      if (!sqlQuery && input?.query) {
        sqlQuery = input.query;
      }

      // Fallback to result.query if still not found
      if (!sqlQuery && output?.result?.query) {
        sqlQuery = output.result.query;
      }

      const executedFlag =
        output &&
        'executed' in output &&
        typeof (output as Record<string, unknown>).executed === 'boolean'
          ? (output as Record<string, unknown>).executed
          : undefined;

      // Check if we should show paste button (inline mode with shouldPaste flag)
      const shouldShowPasteButton = Boolean(
        shouldPaste === true &&
          sqlQuery &&
          onPasteToNotebook &&
          notebookContext?.cellId !== undefined &&
          notebookContext?.notebookCellType &&
          notebookContext?.datasourceId,
      );

      // Create paste handler callback
      const handlePasteToNotebook =
        shouldShowPasteButton && onPasteToNotebook
          ? () => {
              if (
                sqlQuery &&
                notebookContext?.cellId !== undefined &&
                notebookContext?.notebookCellType &&
                notebookContext?.datasourceId
              ) {
                onPasteToNotebook(
                  sqlQuery,
                  notebookContext.notebookCellType,
                  notebookContext.datasourceId,
                  notebookContext.cellId,
                );
              }
            }
          : undefined;

      return (
        <div className="flex w-full flex-col gap-1.5">
          <SQLQueryVisualizer
            query={sqlQuery}
            result={
              hasResults && output?.result
                ? {
                    result: {
                      columns: output.result.columns as string[],
                      rows: output.result.rows as Array<
                        Record<string, unknown>
                      >,
                    },
                  }
                : undefined
            }
            onPasteToNotebook={handlePasteToNotebook}
            showPasteButton={shouldShowPasteButton}
            chartExecutionOverride={chartExecutionOverride}
          />
          {executedFlag === false && (
            <span className="text-muted-foreground text-[11px]">
              Not executed – tool call produced SQL but did not run the query.
            </span>
          )}
        </div>
      );
    }

    // Handle runQueries tool - batch of queries with per-query status + results
    if (part.type === 'tool-runQueries') {
      const runQueriesInput = part.input as {
        queries?: Array<{ id?: string; query: string; summary?: string }>;
      } | null;
      const runQueriesOutput = part.output as
        | {
            results?: Array<{
              id?: string;
              query: string;
              summary?: string;
              success: boolean;
              data?: {
                result?: {
                  columns?: unknown[];
                  rows?: unknown[];
                };
                queryId?: string;
              };
              error?: string;
            }>;
            meta?: { total: number; succeeded: number; failed: number };
          }
        | null
        | undefined;

      const totalQueries = runQueriesInput?.queries?.length ?? 0;
      const results = runQueriesOutput?.results ?? [];
      const completedCount = results.length;
      const isComplete =
        part.state === 'output-available' || part.state === 'output-error';
      const isInProgress = !isComplete && totalQueries > 0;

      // Deduplication and meta calculation
      type RunQueriesDedupeMeta = {
        isDuplicate: boolean;
        baseIndex: number | null;
        attemptIndex: number;
      };

      const keyToBaseIndex = new Map<string, number>();
      const keyToCount = new Map<string, number>();
      const dedupeMeta: RunQueriesDedupeMeta[] = results.map((r, idx) => {
        const idKey =
          typeof r.id === 'string' && r.id.trim().length > 0 ? r.id.trim() : '';
        const queryKey =
          typeof r.query === 'string' && r.query.trim().length > 0
            ? r.query.trim()
            : '';
        const key = idKey || queryKey;
        if (!key)
          return { isDuplicate: false, baseIndex: null, attemptIndex: 1 };
        const existingBaseIndex = keyToBaseIndex.get(key);
        if (existingBaseIndex == null) {
          keyToBaseIndex.set(key, idx);
          keyToCount.set(key, 1);
          return { isDuplicate: false, baseIndex: idx, attemptIndex: 1 };
        }
        const currentCount = (keyToCount.get(key) ?? 1) + 1;
        keyToCount.set(key, currentCount);
        return {
          isDuplicate: true,
          baseIndex: existingBaseIndex,
          attemptIndex: currentCount,
        };
      });

      const _distinctCount = keyToBaseIndex.size || results.length;
      const total = runQueriesOutput?.meta?.total ?? totalQueries;
      const succeeded =
        runQueriesOutput?.meta?.succeeded ??
        results.filter((r) => r.success).length;
      const failed =
        runQueriesOutput?.meta?.failed ??
        (isComplete
          ? total - succeeded
          : results.filter((r) => !r.success && r.error).length);
      const _durationMs = (
        runQueriesOutput?.meta as { durationMs?: number } | undefined
      )?.durationMs;
      const _formatDuration = (ms: number | undefined) => {
        if (ms == null || Number.isNaN(ms)) return null;
        if (ms < 1000) return `${Math.round(ms)} ms`;
        const seconds = ms / 1000;
        if (seconds < 10) return `${seconds.toFixed(2)} s`;
        if (seconds < 60) return `${seconds.toFixed(1)} s`;
        const minutes = Math.floor(seconds / 60);
        const remSeconds = seconds % 60;
        return minutes >= 10
          ? `${minutes} min`
          : `${minutes} min ${Math.round(remSeconds)} s`;
      };

      const tableFromQuery = (
        query: string | undefined,
      ): string | undefined => {
        if (!query || typeof query !== 'string') return undefined;
        const m = /from\s+([a-zA-Z0-9_."]+)/i.exec(query.trim());
        return m?.[1]?.replace(/"/g, '');
      };

      const tableDisplayName = (fullTable: string): string => {
        const lastSegment = fullTable.split('.').pop();
        return lastSegment ?? fullTable;
      };

      const tableFocusedLabel = (
        query: string | undefined,
        index: number,
        id?: string,
      ): string => {
        const fallback =
          id?.trim() && id.trim().length > 0 ? id.trim() : `Query ${index + 1}`;
        if (!query || typeof query !== 'string') return fallback;
        const table = tableFromQuery(query);
        if (!table) return fallback;
        const name = tableDisplayName(table);
        const sql = query.trim();
        if (/select\s+count\(\s*\*\s*\)/i.test(sql))
          return `Row count · ${name}`;
        const limitMatch = /limit\s+(\d+)/i.exec(sql);
        if (limitMatch && /select\s+\*/i.test(sql))
          return `Sample ${limitMatch[1]} · ${name}`;
        if (/group\s+by/i.test(sql)) return `Aggregated · ${name}`;
        return name;
      };

      const providerForTable = (
        fullTable: string | undefined,
        items: Array<{ slug: string; datasource_provider: string }> | undefined,
      ): string | undefined => {
        if (!fullTable || !items?.length) return undefined;
        const firstItem = items[0];
        if (items.length === 1 && firstItem)
          return firstItem.datasource_provider;
        const firstSegment = fullTable.split('.')[0];
        const match = items.find(
          (ds) =>
            firstSegment === ds.slug || fullTable.startsWith(`${ds.slug}.`),
        );
        return match?.datasource_provider;
      };

      // Common Header Info
      const headerInfo = (
        <div className="flex items-center gap-2">
          {isInProgress && (
            <div className="bg-primary/10 text-primary animate-in fade-in zoom-in flex items-center gap-1.5 rounded-full px-2 py-0.5 duration-300">
              <CircleDashedIcon className="h-3 w-3 animate-spin" />
              <span className="text-[10px] font-bold tracking-wider uppercase">
                {completedCount}/{total}
              </span>
            </div>
          )}
          {isComplete && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                <CheckCircle2Icon className="h-3 w-3" />
                {succeeded}
              </span>
              {failed > 0 && (
                <span className="text-destructive flex items-center gap-1 text-[11px] font-medium">
                  <XCircleIcon className="h-3 w-3" />
                  {failed}
                </span>
              )}
            </div>
          )}
        </div>
      );

      if (isMinimal) {
        return (
          <>
            <RunQueriesOpenSync
              runQueriesAllOpen={runQueriesAllOpen}
              runQueriesInputLength={runQueriesInput?.queries?.length}
              resultsLength={results.length}
              setOpenQueries={setOpenQueries}
            />
            <div
              key={`${messageId}-${index}`}
              className="border-border/40 my-1 ml-6 flex flex-col gap-2 border-l pl-3"
            >
              <div className="text-muted-foreground/80 flex items-center gap-2 text-[11px]">
                <ListTodo className="h-3 w-3" />
                <span className="font-medium">Batch Run</span>
                {headerInfo}
              </div>
              <div className="flex flex-col gap-1">
                {(!isComplete ? runQueriesInput?.queries : results)?.map(
                  (q, idx) => {
                    const queryText = (
                      'query' in q
                        ? q.query
                        : (q as Record<string, unknown>).query
                    ) as string | undefined;
                    const success = 'success' in q ? q.success : undefined;
                    const isCurrent = isInProgress && idx === completedCount;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'border-border/10 flex items-center gap-2 rounded-md border px-2 py-0.5 transition-colors',
                          isCurrent && 'bg-primary/[0.03] border-primary/20',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <CodeBlock
                            code={(queryText?.split('\n')[0] ?? '').trim()}
                            language="sql"
                            disableHover={true}
                            className="border-none !bg-transparent bg-transparent p-0"
                          />
                        </div>
                        {success === true && (
                          <CheckCircle2Icon className="h-2.5 w-2.5 text-emerald-500/80" />
                        )}
                        {success === false && (
                          <XCircleIcon className="text-destructive/80 h-2.5 w-2.5" />
                        )}
                        {isCurrent && (
                          <CircleDashedIcon className="text-primary/80 h-2.5 w-2.5 animate-spin" />
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </>
        );
      }

      return (
        <>
          <RunQueriesOpenSync
            runQueriesAllOpen={runQueriesAllOpen}
            runQueriesInputLength={runQueriesInput?.queries?.length}
            resultsLength={results.length}
            setOpenQueries={setOpenQueries}
          />
          <div className="flex w-full flex-col gap-4">
            <div className="bg-card/40 border-border/40 group/summary w-full overflow-hidden rounded-xl border p-4 shadow-sm backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground text-sm font-medium">
                      {isComplete
                        ? `Completed ${total} queries`
                        : `Executing query ${completedCount + 1} of ${total}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isComplete && total > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRunQueriesAllOpen((prev) =>
                          prev === true ? false : true,
                        )
                      }
                      className={cn(
                        'text-muted-foreground border-border/40 bg-muted/20 flex -translate-y-0.5 items-center justify-center rounded-md border p-1.5 opacity-0 transition-all group-hover/summary:translate-y-0 group-hover/summary:opacity-100 hover:scale-105 active:scale-95',
                        runQueriesAllOpen === false &&
                          'bg-primary/10 border-primary/40 text-primary shadow-sm',
                      )}
                      title={
                        runQueriesAllOpen === true
                          ? 'Collapse All'
                          : 'Expand All'
                      }
                    >
                      <ChevronsUpDown className="size-3.5" />
                    </button>
                  )}
                  <div className="text-xl font-black tracking-tighter tabular-nums opacity-80">
                    {Math.round((completedCount / (total || 1)) * 100)}%
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 border-border/10 h-1.5 w-full overflow-hidden rounded-full border">
                <div
                  className={cn(
                    'h-full transition-all duration-500 ease-out',
                    isComplete ? 'bg-emerald-500' : 'bg-primary animate-pulse',
                  )}
                  style={{
                    width: `${total > 0 ? (completedCount / total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Queries List - same width as summary */}
            <div className="flex w-full flex-col gap-4">
              {(!isComplete ? runQueriesInput?.queries : results)?.map(
                (q, idx) => {
                  const queryText = (
                    'query' in q
                      ? q.query
                      : (q as Record<string, unknown>).query
                  ) as string | undefined;
                  const result =
                    'data' in q
                      ? (q as Record<string, unknown>).data?.result
                      : undefined;
                  const success = 'success' in q ? q.success : undefined;
                  const error =
                    'error' in q
                      ? (q as Record<string, unknown>).error
                      : undefined;
                  const rawId = (q as { id?: string }).id;
                  const rawSummary = (q as { summary?: string }).summary;
                  const genAISummary =
                    typeof rawSummary === 'string' &&
                    rawSummary.trim().length > 0
                      ? rawSummary.trim()
                      : undefined;
                  const fallbackLabel =
                    typeof rawId === 'string' && rawId.trim().length > 0
                      ? rawId.trim()
                      : `Query ${idx + 1}`;
                  const displayLabel = genAISummary ?? fallbackLabel;
                  const fullTable = tableFromQuery(queryText);
                  const tableLabel = tableFocusedLabel(
                    queryText,
                    idx,
                    typeof rawId === 'string' ? rawId : undefined,
                  );
                  const provider = providerForTable(
                    fullTable,
                    selectedDatasourceItems,
                  );
                  const datasourceIconUrl =
                    pluginLogoMap && provider
                      ? pluginLogoMap.get(provider)
                      : undefined;
                  const isExecuting = isInProgress && idx === completedCount;

                  const hasTableData =
                    Array.isArray(result?.columns) &&
                    Array.isArray(result?.rows);
                  const tableResult =
                    hasTableData && result
                      ? {
                          columns: result!.columns as string[],
                          rows: result!.rows as Array<Record<string, unknown>>,
                        }
                      : null;
                  const hasTable = !!tableResult;
                  const rowCount = tableResult?.rows.length ?? 0;

                  const meta = dedupeMeta[idx] ?? {
                    isDuplicate: false,
                    baseIndex: null,
                    attemptIndex: 1,
                  };
                  const isOpen = openQueries.has(idx);
                  const isLoading =
                    isExecuting || (!isComplete && idx >= completedCount);
                  const isWaiting =
                    !isComplete && !isExecuting && idx > completedCount;

                  return (
                    <Collapsible
                      key={idx}
                      open={isOpen}
                      onOpenChange={(open) => {
                        setOpenQueries((prev) => {
                          const next = new Set(prev);
                          if (open) {
                            next.add(idx);
                          } else {
                            next.delete(idx);
                          }
                          return next;
                        });
                      }}
                      className={cn(
                        'border-border/40 bg-card/30 w-full overflow-hidden rounded-xl border transition-all duration-200',
                        isExecuting &&
                          'ring-primary/30 border-primary/40 bg-primary/[0.02] shadow-primary/5 shadow-lg ring-2',
                        success === false &&
                          'border-destructive/30 bg-destructive/[0.02]',
                      )}
                    >
                      <CollapsibleTrigger className="group/item hover:bg-muted/40 flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex-shrink-0">
                            {isExecuting ? (
                              <div className="bg-primary/10 rounded-full p-1">
                                <CircleDashedIcon className="text-primary h-4 w-4 animate-spin" />
                              </div>
                            ) : success === true ? (
                              <div className="rounded-full bg-emerald-500/10 p-1">
                                <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                              </div>
                            ) : success === false ? (
                              <div className="bg-destructive/10 rounded-full p-1">
                                <XCircleIcon className="text-destructive h-4 w-4" />
                              </div>
                            ) : (
                              <div className="bg-muted/50 rounded-full p-1 opacity-40">
                                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent" />
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            {isLoading && !isOpen ? (
                              <div className="space-y-1.5">
                                <div className="bg-muted/60 h-3 w-24 animate-pulse rounded" />
                                <div className="bg-muted/40 h-2.5 w-16 animate-pulse rounded" />
                              </div>
                            ) : (
                              <>
                                <span className="mb-1 truncate text-xs leading-none font-bold">
                                  {displayLabel}
                                </span>
                                {meta.isDuplicate && (
                                  <span className="text-muted-foreground text-[10px] font-medium opacity-70">
                                    Retry #{meta.attemptIndex}
                                  </span>
                                )}
                                {isWaiting && (
                                  <span className="text-muted-foreground text-[10px] italic">
                                    Waiting...
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <div className="text-muted-foreground hidden max-w-[14rem] min-w-0 items-center gap-1.5 truncate sm:flex">
                            {datasourceIconUrl ? (
                              <img
                                src={datasourceIconUrl}
                                alt=""
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0 object-contain',
                                  provider === 'json-online' && 'dark:invert',
                                )}
                              />
                            ) : (
                              <Database className="h-3.5 w-3.5 shrink-0 opacity-80" />
                            )}
                            <span
                              className="truncate font-medium"
                              title={fullTable}
                            >
                              {tableLabel}
                            </span>
                          </div>
                          {hasTable && (
                            <span className="text-muted-foreground bg-muted/50 shrink-0 rounded-full px-2 py-0.5 font-medium tabular-nums">
                              {rowCount} {rowCount === 1 ? 'row' : 'rows'}
                            </span>
                          )}
                          <div className="bg-muted/40 flex size-6 shrink-0 items-center justify-center rounded-md transition-transform group-hover/item:scale-110">
                            <ChevronDownIcon className="size-3.5 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-180" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      {isOpen && (
                        <CollapsibleContent className="border-border/10 animate-in slide-in-from-top-2 border-t bg-transparent duration-300">
                          {isLoading ? (
                            <div className="space-y-4 p-4">
                              <div className="space-y-1.5">
                                <p className="text-muted-foreground pl-1 text-[10px] font-bold tracking-widest uppercase">
                                  SQL Query
                                </p>
                                <TableResultsSkeleton />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 p-4">
                              <div className="space-y-1.5">
                                <p className="text-muted-foreground pl-1 text-[10px] font-bold tracking-widest uppercase">
                                  SQL Query
                                </p>
                                <SQLQueryVisualizer
                                  query={queryText ?? ''}
                                  result={
                                    tableResult
                                      ? {
                                          result: tableResult,
                                        }
                                      : undefined
                                  }
                                  onPasteToNotebook={undefined}
                                  showPasteButton={false}
                                  chartExecutionOverride={false}
                                />
                              </div>
                              {error && (
                                <div className="mt-2">
                                  <p className="text-destructive mb-1 pl-1 text-[10px] font-bold tracking-widest uppercase">
                                    Error Details
                                  </p>
                                  <ToolErrorVisualizer errorText={error} />
                                </div>
                              )}
                            </div>
                          )}
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                },
              )}
            </div>
          </div>
        </>
      );
    }

    // Handle getSchema - streaming/loading, then schema when output
    if (part.type === 'tool-getSchema') {
      const input = part.input as { viewNames?: string[] } | null;
      if (!part.output && part.input != null) {
        const isInputStreaming = part.state === 'input-streaming';
        return (
          <div className="flex w-full flex-col gap-3">
            {input?.viewNames && input.viewNames.length > 0 && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                  Requested Views
                </p>
                <p className="text-sm">{input.viewNames.join(', ')}</p>
                {isInputStreaming && (
                  <span
                    className="text-foreground mt-1 inline-block h-4 w-0.5 shrink-0 animate-pulse rounded-sm bg-current align-middle"
                    aria-hidden
                  />
                )}
              </div>
            )}
            {!isInputStreaming && <SchemaSkeleton />}
          </div>
        );
      }
    }
    if (part.type === 'tool-getSchema' && part.output) {
      const output = part.output as { schema?: DatasourceMetadata } | null;
      if (output?.schema) {
        return <SchemaVisualizer schema={output.schema} variant={variant} />;
      } else {
        // Empty state when no schema data
        return (
          <div
            className={cn(
              'flex flex-col items-center justify-center p-8 text-center',
              variant === 'minimal' && 'p-4',
            )}
          >
            <Database
              className={cn(
                'text-muted-foreground mb-4 opacity-50',
                variant === 'minimal' ? 'mb-2 h-8 w-8' : 'h-12 w-12',
              )}
            />
            <h3
              className={cn(
                'text-foreground mb-2 font-semibold',
                variant === 'minimal' ? 'text-xs' : 'text-sm',
              )}
            >
              <Trans
                i18nKey="common:schema.noSchemaDataAvailable"
                defaults="No schema data available"
              />
            </h3>
            <p
              className={cn(
                'text-muted-foreground',
                variant === 'minimal' ? 'text-[10px]' : 'text-xs',
              )}
            >
              <Trans
                i18nKey="common:schema.schemaEmptyOrNotLoaded"
                defaults="The schema information is empty or could not be loaded."
              />
            </p>
          </div>
        );
      }
    }

    // Handle viewSheet - streaming/loading, then sheet when output
    if (part.type === 'tool-viewSheet') {
      const input = part.input as { sheetName?: string } | null;
      if (!part.output && part.input != null) {
        const isInputStreaming = part.state === 'input-streaming';
        return (
          <div className="flex w-full flex-col gap-3">
            {input?.sheetName && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                  Sheet
                </p>
                <p className="text-sm">{input.sheetName}</p>
                {isInputStreaming && (
                  <span
                    className="text-foreground mt-1 inline-block h-4 w-0.5 shrink-0 animate-pulse rounded-sm bg-current align-middle"
                    aria-hidden
                  />
                )}
              </div>
            )}
            {!isInputStreaming && <SheetSkeleton />}
          </div>
        );
      }
    }
    if (part.type === 'tool-viewSheet' && part.output) {
      const output = part.output as {
        sheetName?: string;
        columns?: string[];
        rows?: Array<Record<string, unknown>>;
        rowCount?: number;
        limit?: number;
        hasMore?: boolean;
      } | null;
      if (output?.sheetName && output?.columns && output?.rows !== undefined) {
        const displayedRows = output.rows.length;
        const totalRows = output.rowCount ?? displayedRows;
        return (
          <ViewSheetVisualizer
            data={{
              sheetName: output.sheetName,
              totalRows,
              displayedRows,
              columns: output.columns,
              rows: output.rows,
              message: output.hasMore
                ? `Showing first ${displayedRows} of ${totalRows} rows`
                : `Displaying all ${totalRows} rows`,
            }}
          />
        );
      }
    }

    // Handle viewSheet errors with ViewSheetError
    if (
      part.type === 'tool-viewSheet' &&
      part.state === 'output-error' &&
      part.errorText
    ) {
      const input = part.input as { sheetName?: string } | null;
      return (
        <ViewSheetError
          errorText={part.errorText}
          sheetName={input?.sheetName}
        />
      );
    }

    // Handle generateChart - streaming/loading, then chart when output
    if (part.type === 'tool-generateChart') {
      const input = part.input as {
        queryResults?: { sqlQuery?: string };
      } | null;
      if (!part.output && part.input != null) {
        const isInputStreaming = part.state === 'input-streaming';
        return (
          <div className="flex w-full flex-col gap-3">
            {input?.queryResults?.sqlQuery && (
              <SQLQueryVisualizer
                query={input.queryResults.sqlQuery}
                result={undefined}
                isStreaming={isInputStreaming}
              />
            )}
            {!input?.queryResults?.sqlQuery && (
              <div className="bg-muted/50 rounded-md p-3">
                {isInputStreaming && (
                  <span
                    className="text-foreground inline-block h-4 w-0.5 shrink-0 animate-pulse rounded-sm bg-current align-middle"
                    aria-hidden
                  />
                )}
              </div>
            )}
            {!isInputStreaming && <ChartSkeleton />}
          </div>
        );
      }
    }
    if (part.type === 'tool-generateChart' && part.output) {
      const output = part.output as ChartConfig | null;
      if (output?.chartType && output?.data && output?.config) {
        return <ChartRenderer chartConfig={output} />;
      }
    }

    // Handle selectChartType - streaming/loading, then selection when output
    if (part.type === 'tool-selectChartType') {
      const input = part.input as {
        queryResults?: { sqlQuery?: string };
      } | null;
      if (!part.output && part.input != null) {
        const isInputStreaming = part.state === 'input-streaming';
        return (
          <div className="flex w-full flex-col gap-3">
            {input?.queryResults?.sqlQuery && (
              <SQLQueryVisualizer
                query={input.queryResults.sqlQuery}
                result={undefined}
                isStreaming={isInputStreaming}
              />
            )}
            {!isInputStreaming && <SelectChartTypeSkeleton />}
          </div>
        );
      }
    }
    if (part.type === 'tool-selectChartType' && part.output) {
      const output = part.output as ChartTypeSelection | null;
      if (output?.chartType && output?.reasoningText) {
        return <ChartTypeSelector selection={output} />;
      }
    }

    // Generic: no output yet but have input - show streaming/loading
    if (!part.output && part.input != null) {
      const isInputStreaming = part.state === 'input-streaming';
      return (
        <div className="flex w-full flex-col gap-3">
          {isInputStreaming && (
            <span
              className="text-foreground inline-block h-4 w-0.5 shrink-0 animate-pulse rounded-sm bg-current align-middle"
              aria-hidden
            />
          )}
          {!isInputStreaming && <GenericToolSkeleton />}
        </div>
      );
    }

    return <ToolOutput output={part.output} errorText={part.errorText} />;
  };

  // Hide input section for runQuery (we show SQL in SQLQueryVisualizer)
  const showInput =
    part.input != null &&
    part.type !== 'tool-runQuery' &&
    part.type !== 'tool-runQueries';

  const isControlled = open !== undefined;
  return (
    <Tool
      key={`${messageId}-${index}`}
      {...(isControlled
        ? { open, onOpenChange }
        : {
            defaultOpen:
              defaultOpenWhenUncontrolled ?? TOOL_UI_CONFIG.DEFAULT_OPEN,
          })}
      variant={variant}
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 duration-300 ease-in-out',
        'max-w-[min(43.2rem,calc(100%-3rem))]',
        'mx-4 sm:mx-6',
      )}
    >
      <ToolHeader
        title={toolName}
        type={part.type}
        state={part.state}
        variant={variant}
      />
      <ToolContent variant={variant} className="max-w-full min-w-0 p-0">
        {showInput ? (
          <ToolInput input={part.input} className="border-b" />
        ) : null}
        <div className="max-w-full min-w-0 overflow-hidden p-4">
          {renderToolOutput()}
        </div>
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
