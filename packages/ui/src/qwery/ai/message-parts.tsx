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

import { SQLQueryVisualizer } from './sql-query-visualizer';

import { cn } from '../../lib/utils';
import { SchemaVisualizer } from './schema-visualizer';
import { TOOL_UI_CONFIG } from './tool-ui-config';

import { ViewSheetVisualizer } from './sheets/view-sheet-visualizer';

import { ViewSheetError } from './sheets/view-sheet-error';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../../ai-elements/sources';
import { useState, createContext, useMemo } from 'react';
import { CopyIcon, RefreshCcwIcon, CheckIcon } from 'lucide-react';
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
  ChartTypeSelector,
  type ChartTypeSelection,
} from './charts/chart-type-selector';
import type { NotebookCellType } from './utils/notebook-cell-type';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'error';

export interface MarkdownContextValue {
  sendMessage?: ReturnType<typeof useChat>['sendMessage'];
  messages?: UIMessage[];
  currentMessageId?: string;
}

export const MarkdownContext = createContext<MarkdownContextValue>({});

export const MarkdownProvider = MarkdownContext.Provider;

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
  sendMessage?: ReturnType<typeof useChat>['sendMessage'];
  messages?: UIMessage[];
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
      value={{ sendMessage, messages, currentMessageId: messageId }}
    >
      <HeadingContext.Provider value={headingContextValue}>
        <Message 
          key={`${messageId}-${index}`} 
          from={messageRole}
          className={messageRole === 'assistant' ? 'mt-4' : undefined}
        >
          <MessageContent>
            <div className="prose prose-sm dark:prose-invert overflow-wrap-anywhere max-w-none min-w-0 overflow-x-hidden break-words [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&>*]:max-w-full [&>*]:min-w-0">
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
}

export function ReasoningPart({
  part,
  messageId,
  index,
  isStreaming,
  sendMessage,
  messages,
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
      value={{ sendMessage, messages, currentMessageId: messageId }}
    >
      <HeadingContext.Provider value={headingContextValue}>
        <Reasoning
          key={`${messageId}-${index}`}
          className="w-full"
          isStreaming={isStreaming}
        >
          <ReasoningTrigger />
          <ReasoningContent>
            <div className="prose prose-sm dark:prose-invert overflow-wrap-anywhere [&_p]:text-foreground/90 [&_li]:text-foreground/90 [&_strong]:text-foreground [&_em]:text-foreground/80 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-primary max-w-none min-w-0 overflow-x-hidden break-words [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&>*]:max-w-full [&>*]:min-w-0">
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

export interface ToolPartProps {
  part: ToolUIPart;
  messageId: string;
  index: number;
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
}

export function ToolPart({
  part,
  messageId,
  index,
  onPasteToNotebook,
  notebookContext,
}: ToolPartProps) {
  const { variant } = useToolVariant();
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

    // Generic error handler for other tools
    if (part.state === 'output-error' && part.errorText) {
      return <ToolErrorVisualizer errorText={part.errorText} />;
    }

    // Handle generateSql tool - show SQL only, no results
    if (part.type === 'tool-generateSql' && part.output) {
      const output = part.output as { query?: string } | null;
      return (
        <SQLQueryVisualizer
          query={output?.query}
          result={undefined} // No results for generateSql
        />
      );
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

      // During streaming, show SQL from input even if output is not available yet
      if (!part.output && input?.query) {
        return (
          <SQLQueryVisualizer
            query={input.query}
            result={undefined}
            onPasteToNotebook={undefined}
            showPasteButton={false}
            chartExecutionOverride={false}
          />
        );
      }

      // If no output and no input query, don't render anything yet
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
        <SQLQueryVisualizer
          query={sqlQuery}
          result={
            hasResults && output?.result
              ? {
                  result: {
                    columns: output.result.columns as string[],
                    rows: output.result.rows as Array<Record<string, unknown>>,
                  },
                }
              : undefined
          }
          onPasteToNotebook={handlePasteToNotebook}
          showPasteButton={shouldShowPasteButton}
          chartExecutionOverride={chartExecutionOverride}
        />
      );
    }

    // Handle getSchema tool with SchemaVisualizer
    if (part.type === 'tool-getSchema' && part.output) {
      const output = part.output as {
        schema?: {
          databaseName: string;
          schemaName: string;
          tables: Array<{
            tableName: string;
            columns: Array<{ columnName: string; columnType: string }>;
          }>;
        };
      } | null;
      if (output?.schema) {
        return <SchemaVisualizer schema={output.schema} />;
      }
    }

    // Handle viewSheet tool with ViewSheetVisualizer
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

    // Handle generateChart tool with ChartRenderer
    if (part.type === 'tool-generateChart' && part.output) {
      const output = part.output as ChartConfig | null;
      if (output?.chartType && output?.data && output?.config) {
        return <ChartRenderer chartConfig={output} />;
      }
    }

    // Handle selectChartType tool with ChartTypeSelector
    if (part.type === 'tool-selectChartType' && part.output) {
      const output = part.output as ChartTypeSelection | null;
      if (output?.chartType && output?.reasoning) {
        return <ChartTypeSelector selection={output} />;
      }
    }

    // Default fallback to generic ToolOutput
    return <ToolOutput output={part.output} errorText={part.errorText} />;
  };

  // Hide input section for runQuery (we show SQL in SQLQueryVisualizer)
  const showInput = part.input != null && part.type !== 'tool-runQuery';

  return (
    <Tool
      key={`${messageId}-${index}`}
      defaultOpen={TOOL_UI_CONFIG.DEFAULT_OPEN}
      variant={variant}
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 duration-300 ease-in-out',
        TOOL_UI_CONFIG.MAX_WIDTH,
        'mx-auto',
      )}
    >
        <ToolHeader title={toolName} type={part.type} state={part.state} variant={variant} />
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
