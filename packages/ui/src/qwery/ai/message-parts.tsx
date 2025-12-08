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
import { ChartRenderer, type ChartConfig } from './charts/chart-renderer';
import { ChartTypeSelector, type ChartTypeSelection } from './charts/chart-type-selector';
import { SQLQueryVisualizer, type SQLQueryResult } from './sql-query-visualizer';
import { SchemaVisualizer, type SchemaData } from './schema-visualizer';
import {
  AvailableSheetsVisualizer,
  type AvailableSheetsData,
} from './sheets/available-sheets-visualizer';
import {
  ViewSheetVisualizer,
  type ViewSheetData,
} from './sheets/view-sheet-visualizer';
import { ViewSheetError } from './sheets/view-sheet-error';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../../ai-elements/sources';
import { useMemo, useState } from 'react';
import {
  CopyIcon,
  RefreshCcwIcon,
  CheckCircleIcon,
  XCircleIcon,
  CheckIcon,
} from 'lucide-react';
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
  const [isCopied, setIsCopied] = useState(false);

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

function ChartToolOutput({
  output,
  errorText,
}: {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
}) {
  if (errorText) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  if (!output) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  // Parse output - it might be a string (JSON) or an object
  let parsedOutput: unknown = output;
  if (typeof output === 'string') {
    try {
      parsedOutput = JSON.parse(output);
    } catch {
      // If parsing fails, it's not JSON, fall back to regular output
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[ChartToolOutput] Output type:', typeof output);
    console.log('[ChartToolOutput] Parsed output:', parsedOutput);
  }

  // Check if output matches chart config structure
  if (
    parsedOutput &&
    typeof parsedOutput === 'object' &&
    !Array.isArray(parsedOutput) &&
    'chartType' in parsedOutput &&
    'data' in parsedOutput &&
    'config' in parsedOutput
  ) {
    try {
      const chartConfig = parsedOutput as ChartConfig;
      
      // Validate chart config has required fields
      if (
        !chartConfig.chartType ||
        !Array.isArray(chartConfig.data) ||
        !chartConfig.config
      ) {
        console.warn('[ChartToolOutput] Invalid chart config structure:', chartConfig);
        return <ToolOutput output={output} errorText={errorText} />;
      }

      return (
        <div className="min-w-0 space-y-2 p-4">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Chart
          </h4>
          <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4 w-full">
            <ChartRenderer chartConfig={chartConfig} />
          </div>
        </div>
      );
    } catch (error) {
      console.error('[ChartToolOutput] Error rendering chart:', error, parsedOutput);
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  return <ToolOutput output={output} errorText={errorText} />;
}

function ChartTypeSelectionOutput({
  output,
  errorText,
}: {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
}) {
  if (errorText) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  if (!output) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  // Parse output - it might be a string (JSON) or an object
  let parsedOutput: unknown = output;
  if (typeof output === 'string') {
    try {
      parsedOutput = JSON.parse(output);
    } catch {
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  // Check if output matches chart type selection structure
  if (
    parsedOutput &&
    typeof parsedOutput === 'object' &&
    !Array.isArray(parsedOutput) &&
    'chartType' in parsedOutput &&
    'reasoning' in parsedOutput
  ) {
    try {
      const selection = parsedOutput as ChartTypeSelection;
      return (
        <div className="min-w-0 space-y-2 p-4">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Chart Type Selection
          </h4>
          <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
            <ChartTypeSelector selection={selection} />
          </div>
        </div>
      );
    } catch (error) {
      console.error('[ChartTypeSelectionOutput] Error:', error);
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  return <ToolOutput output={output} errorText={errorText} />;
}

function SchemaOutput({
  output,
  errorText,
}: {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
}) {
  if (errorText) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  if (!output) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  // Parse output - it might be a string (JSON) or an object
  let parsedOutput: unknown = output;
  if (typeof output === 'string') {
    try {
      parsedOutput = JSON.parse(output);
    } catch {
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  // Check if output matches schema structure
  if (
    parsedOutput &&
    typeof parsedOutput === 'object' &&
    !Array.isArray(parsedOutput) &&
    'schema' in parsedOutput &&
    parsedOutput.schema &&
    typeof parsedOutput.schema === 'object' &&
    'tables' in parsedOutput.schema
  ) {
    try {
      const schema = parsedOutput.schema as SchemaData;
      return (
        <div className="min-w-0 space-y-2 p-4">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Schema
          </h4>
          <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
            <SchemaVisualizer schema={schema} />
          </div>
        </div>
      );
    } catch (error) {
      console.error('[SchemaOutput] Error:', error);
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  return <ToolOutput output={output} errorText={errorText} />;
}

function SQLQueryOutput({
  output,
  input,
  errorText,
}: {
  output: ToolUIPart['output'];
  input: ToolUIPart['input'];
  errorText: ToolUIPart['errorText'];
}) {
  if (errorText) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  if (!output) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  // Parse output - it might be a string (JSON) or an object
  let parsedOutput: unknown = output;
  if (typeof output === 'string') {
    try {
      parsedOutput = JSON.parse(output);
    } catch {
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  // Extract query from input
  let query: string | undefined;
  if (input && typeof input === 'object' && 'query' in input) {
    query = typeof input.query === 'string' ? input.query : undefined;
  }

  // Check if output matches SQL query result structure
  if (
    parsedOutput &&
    typeof parsedOutput === 'object' &&
    !Array.isArray(parsedOutput) &&
    'result' in parsedOutput &&
    parsedOutput.result &&
    typeof parsedOutput.result === 'object' &&
    'columns' in parsedOutput.result &&
    'rows' in parsedOutput.result
  ) {
    try {
      const result = parsedOutput as SQLQueryResult;
      return (
        <div className="min-w-0 space-y-2 p-4">
          <SQLQueryVisualizer query={query} result={result} />
        </div>
      );
    } catch (error) {
      console.error('[SQLQueryOutput] Error:', error);
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  return <ToolOutput output={output} errorText={errorText} />;
}

function AvailableSheetsOutput({
  output,
  errorText,
}: {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
}) {
  const parsedOutput = useMemo(() => {
    if (!output) return null;
    if (typeof output === 'string') {
      try {
        return JSON.parse(output);
      } catch {
        return null;
      }
    }
    return output;
  }, [output]);

  // Memoize adapted data to prevent creating new object on every render
  const adaptedData = useMemo(() => {
    if (!parsedOutput) return null;

    // Check if output matches listViews structure (views array)
    if (
      parsedOutput &&
      typeof parsedOutput === 'object' &&
      !Array.isArray(parsedOutput) &&
      'views' in parsedOutput &&
      Array.isArray(parsedOutput.views)
    ) {
      const viewsData = parsedOutput as {
        views: Array<{
          viewName: string;
          displayName?: string;
        }>;
        message: string;
      };
      return {
        sheets: viewsData.views.map((view) => ({
          name: view.viewName,
          type: 'view' as const,
        })),
        message: viewsData.message,
      } as AvailableSheetsData;
    }

    // Check if output matches available sheets structure (backward compatibility)
    if (
      parsedOutput &&
      typeof parsedOutput === 'object' &&
      !Array.isArray(parsedOutput) &&
      'sheets' in parsedOutput &&
      Array.isArray(parsedOutput.sheets)
    ) {
      return parsedOutput as AvailableSheetsData;
    }

    return null;
  }, [parsedOutput]);

  if (errorText) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  if (!output || !adaptedData) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  return (
    <div className="min-w-0 p-4">
      <AvailableSheetsVisualizer data={adaptedData} />
    </div>
  );
}

function ViewSheetOutput({
  output,
  errorText,
  input,
  availableSheets,
  onRetry,
}: {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
  input?: ToolUIPart['input'];
  availableSheets?: string[];
  onRetry?: (sheetName: string) => void;
}) {
  if (errorText) {
    // Extract sheet name from input if available
    let sheetName: string | undefined;
    if (input && typeof input === 'object' && 'sheetName' in input) {
      sheetName =
        typeof input.sheetName === 'string' ? input.sheetName : undefined;
    }

    return (
      <div className="min-w-0 space-y-2 p-4">
        <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Sheet View
        </h4>
        <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
          <ViewSheetError
            errorText={errorText}
            sheetName={sheetName}
            availableSheets={availableSheets}
            onRetry={onRetry}
          />
        </div>
      </div>
    );
  }

  if (!output) {
    return <ToolOutput output={output} errorText={errorText} />;
  }

  // Parse output - it might be a string (JSON) or an object
  let parsedOutput: unknown = output;
  if (typeof output === 'string') {
    try {
      parsedOutput = JSON.parse(output);
    } catch {
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  // Check if output matches view sheet structure
  if (
    parsedOutput &&
    typeof parsedOutput === 'object' &&
    !Array.isArray(parsedOutput) &&
    'sheetName' in parsedOutput &&
    'columns' in parsedOutput &&
    'rows' in parsedOutput
  ) {
    try {
      const data = parsedOutput as ViewSheetData;
      return (
        <div className="min-w-0 space-y-2 p-4">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Sheet View
          </h4>
          <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
            <ViewSheetVisualizer data={data} />
          </div>
        </div>
      );
    } catch (error) {
      console.error('[ViewSheetOutput] Error:', error);
      return <ToolOutput output={output} errorText={errorText} />;
    }
  }

  return <ToolOutput output={output} errorText={errorText} />;
}

export function ToolPart({ part, messageId, index }: ToolPartProps) {
  const toolName = part.type.replace('tool-', '');
  const isGenerateChart = part.type === 'tool-generateChart';
  const isSelectChartType = part.type === 'tool-selectChartType';
  const isRunQuery = part.type === 'tool-runQuery';
  const isGetSchema = part.type === 'tool-getSchema';
  const isListAvailableSheets =
    part.type === 'tool-listAvailableSheets';
  const isViewSheet = part.type === 'tool-viewSheet';

  return (
    <Tool
      key={`${messageId}-${index}`}
      defaultOpen={part.state === 'output-error'}
    >
      <ToolHeader title={toolName} type={part.type} state={part.state} />
      <ToolContent>
        {part.input != null &&
        !isRunQuery &&
        !isGetSchema &&
        !isListAvailableSheets &&
        !isViewSheet ? (
          <ToolInput input={part.input} />
        ) : null}
        {isSelectChartType ? (
          <ChartTypeSelectionOutput
            output={part.output}
            errorText={part.errorText}
          />
        ) : isGenerateChart ? (
          <ChartToolOutput output={part.output} errorText={part.errorText} />
        ) : isGetSchema ? (
          <SchemaOutput
            output={part.output}
            errorText={part.errorText}
          />
        ) : isRunQuery ? (
          <SQLQueryOutput
            output={part.output}
            input={part.input}
            errorText={part.errorText}
          />
        ) : isListAvailableSheets ? (
          <AvailableSheetsOutput
            output={part.output}
            errorText={part.errorText}
          />
        ) : isViewSheet ? (
          <ViewSheetOutput
            output={part.output}
            errorText={part.errorText}
          />
        ) : (
          <ToolOutput output={part.output} errorText={part.errorText} />
        )}
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
