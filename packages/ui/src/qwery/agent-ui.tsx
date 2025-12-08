'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '../ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '../ai-elements/message';
import {
  type PromptInputMessage,
  usePromptInputAttachments,
  PromptInputProvider,
  usePromptInputController,
} from '../ai-elements/prompt-input';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAgentStatus } from './agent-status-context';
import {
  CopyIcon,
  RefreshCcwIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '../shadcn/button';
import { Textarea } from '../shadcn/textarea';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '../ai-elements/reasoning';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '../ai-elements/tool';
import { Loader } from '../ai-elements/loader';
import { ChatTransport, UIMessage, ToolUIPart } from 'ai';
import { ChartRenderer, type ChartConfig } from './ai/charts/chart-renderer';
import { ChartTypeSelector, type ChartTypeSelection } from './ai/charts/chart-type-selector';
import { SQLQueryVisualizer, type SQLQueryResult } from './ai/sql-query-visualizer';
import { SchemaVisualizer, type SchemaData } from './ai/schema-visualizer';
import {
  AvailableSheetsVisualizer,
  type AvailableSheetsData,
} from './ai/sheets/available-sheets-visualizer';
import {
  ViewSheetVisualizer,
  type ViewSheetData,
} from './ai/sheets/view-sheet-visualizer';
import { ViewSheetError } from './ai/sheets/view-sheet-error';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { BotAvatar } from './bot-avatar';
import { Sparkles } from 'lucide-react';
import { QweryPromptInput, type DatasourceItem } from './ai';
import { QweryContextProps } from './ai/context';

export interface QweryAgentUIProps {
  initialMessages?: UIMessage[];
  transport: (model: string) => ChatTransport<UIMessage>;
  models: { name: string; value: string }[];
  onOpen?: () => void;
  usage?: QweryContextProps;
  emitFinish?: () => void;
  // Datasource selector props
  datasources?: DatasourceItem[];
  selectedDatasources?: string[];
  onDatasourceSelectionChange?: (datasourceIds: string[]) => void;
  pluginLogoMap?: Map<string, string>;
  datasourcesLoading?: boolean;
  // Message persistence
  onMessageUpdate?: (messageId: string, content: string) => Promise<void>;
}

export default function QweryAgentUI(props: QweryAgentUIProps) {
  const {
    initialMessages,
    transport,
    models,
    onOpen,
    usage,
    emitFinish,
    datasources,
    selectedDatasources,
    onDatasourceSelectionChange,
    pluginLogoMap,
    datasourcesLoading,
    onMessageUpdate,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    if (!hasFocusedRef.current && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              entry.isIntersecting &&
              entry.intersectionRatio > 0.3 &&
              !hasFocusedRef.current
            ) {
              hasFocusedRef.current = true;
              setTimeout(() => {
                textareaRef.current?.focus();
                onOpen?.();
              }, 300);
            }
          });
        },
        { threshold: 0.3 },
      );

      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [onOpen]);

  const [state, setState] = useState({
    input: '',
    model: models[0]?.value ?? '',
    webSearch: false,
  });

  const transportInstance = useMemo(
    () => transport(state.model),
    [transport, state.model],
  );

  const { messages, sendMessage, status, regenerate, stop, setMessages } =
    useChat({
      messages: initialMessages,
      experimental_throttle: 100,
      transport: transportInstance,
    });
  
  const { setIsProcessing } = useAgentStatus();
  
  useEffect(() => {
    setIsProcessing(status === 'streaming' || status === 'submitted');
  }, [status, setIsProcessing]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const regenCountRef = useRef<Map<string, number>>(new Map());
  const viewSheetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [copiedMessagePartId, setCopiedMessagePartId] = useState<string | null>(null);

  // Handle edit message
  const handleEditStart = useCallback((messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditText(text);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
    setEditText('');
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!editingMessageId || !editText.trim()) return;

    const updatedText = editText.trim();

    // Update UI state immediately
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === editingMessageId) {
          return {
            ...msg,
            parts: msg.parts.map((p) =>
              p.type === 'text' ? { ...p, text: updatedText } : p,
            ),
          };
        }
        return msg;
      }),
    );

    setEditingMessageId(null);
    setEditText('');

    // Persist to database if callback provided
    if (onMessageUpdate) {
      try {
        await onMessageUpdate(editingMessageId, updatedText);
      } catch (error) {
        console.error('Failed to persist message edit:', error);
        // Optionally show error toast here
      }
    }
  }, [editingMessageId, editText, setMessages, onMessageUpdate]);

  const handleRegenerate = useCallback(async () => {
    const lastAssistantMessage = messages
      .filter((m) => m.role === 'assistant')
      .at(-1);
    if (lastAssistantMessage) {
      const current = regenCountRef.current.get(lastAssistantMessage.id) ?? 0;
      regenCountRef.current.set(lastAssistantMessage.id, current + 1);
    }

    regenerate();
  }, [messages, regenerate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== textareaRef.current &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const lastAssistantMessage = useMemo(
    () => messages.filter((m) => m.role === 'assistant').at(-1),
    [messages],
  );

  // Compute regen counts for all messages to avoid ref access during render
  const [regenCountsMap, setRegenCountsMap] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    const counts = new Map<string, number>();
    messages.forEach((msg) => {
      counts.set(msg.id, regenCountRef.current.get(msg.id) ?? 0);
    });
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => setRegenCountsMap(counts), 0);
  }, [messages]);

  // Track previous view sheet count to detect new additions
  const prevViewSheetCountRef = useRef(0);

  // Auto-scroll to view sheet when it's rendered
  useEffect(() => {
    // Find all view sheet outputs
    const viewSheetEntries = Array.from(viewSheetRefs.current.entries());
    const currentCount = viewSheetEntries.length;

    // Only scroll if a new view sheet was added (count increased)
    if (currentCount > prevViewSheetCountRef.current && viewSheetEntries.length > 0) {
      // Get the last (most recent) view sheet
      const lastEntry = viewSheetEntries[viewSheetEntries.length - 1];
      if (lastEntry && lastEntry[1]) {
        const lastViewSheetElement = lastEntry[1];
        // Small delay to ensure DOM is fully rendered
        setTimeout(() => {
          lastViewSheetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 300);
      }
    }

    // Update the previous count
    prevViewSheetCountRef.current = currentCount;
  }, [messages, status]); // Re-run when messages or status changes

  return (
    <PromptInputProvider initialInput={state.input}>
      <div
        ref={containerRef}
        className="relative mx-auto flex h-full w-full max-w-4xl min-w-0 flex-col p-6"
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Conversation className="min-h-0 min-w-0 flex-1">
            <ConversationContent className="min-w-0">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  title="Start a conversation"
                  description="Ask me anything and I'll help you out. You can ask questions or get explanations."
                  icon={<Sparkles className="text-muted-foreground size-12" />}
                />
              ) : (
                messages.map((message) => {
                  const sourceParts = message.parts.filter(
                    (part: { type: string }) => part.type === 'source-url',
                  );

                  const textParts = message.parts.filter(
                    (p) => p.type === 'text',
                  );
                  const isLastAssistantMessage =
                    message.id === lastAssistantMessage?.id;
                  const regenCount = regenCountsMap.get(message.id) ?? 0;

                  const lastTextPartIndex =
                    textParts.length > 0
                      ? message.parts.findLastIndex((p) => p.type === 'text')
                      : -1;

                  return (
                    <div
                      key={message.id}
                    >
                      {message.role === 'assistant' &&
                        sourceParts.length > 0 && (
                          <Sources>
                            <SourcesTrigger count={sourceParts.length} />
                            {sourceParts.map((part, i: number) => {
                              const sourcePart = part as {
                                type: 'source-url';
                                url?: string;
                              };
                              return (
                                <SourcesContent key={`${message.id}-${i}`}>
                                  <Source
                                    key={`${message.id}-${i}`}
                                    href={sourcePart.url}
                                    title={sourcePart.url}
                                  />
                                </SourcesContent>
                              );
                            })}
                          </Sources>
                        )}
                      {message.parts.map((part, i: number) => {
                        const isLastTextPart =
                          part.type === 'text' && i === lastTextPartIndex;
                        const isStreaming =
                          status === 'streaming' &&
                          isLastAssistantMessage &&
                          isLastTextPart;
                        const isResponseComplete =
                          !isStreaming &&
                          isLastAssistantMessage &&
                          isLastTextPart;
                        switch (part.type) {
                          case 'text': {
                            const isEditing = editingMessageId === message.id;
                            return (
                              <div
                                key={`${message.id}-${i}`}
                                className={cn(
                                  'flex items-start gap-3',
                                  message.role === 'user' && 'justify-end',
                                  message.role === 'assistant' &&
                                    'animate-in fade-in slide-in-from-bottom-4 duration-300',
                                  message.role === 'user' &&
                                    'animate-in fade-in slide-in-from-bottom-4 duration-300',
                                )}
                              >
                                {message.role === 'assistant' && (
                                  <div className="mt-1 shrink-0">
                                  <BotAvatar
                                    size={6}
                                      isLoading={isStreaming}
                                  />
                                  </div>
                                )}
                                <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2">
                                  {isEditing && message.role === 'user' ? (
                                    <>
                                      <Textarea
                                        value={editText}
                                        onChange={(e) =>
                                          setEditText(e.target.value)
                                        }
                                        className="min-h-[60px] resize-none"
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === 'Enter' &&
                                            (e.metaKey || e.ctrlKey)
                                          ) {
                                            e.preventDefault();
                                            handleEditSubmit();
                                          } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleEditCancel();
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <div className="mt-1 flex items-center justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={handleEditSubmit}
                                          className="h-7 w-7"
                                          title="Save"
                                        >
                                          <CheckIcon className="size-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={handleEditCancel}
                                          className="h-7 w-7"
                                          title="Cancel"
                                        >
                                          <XIcon className="size-3" />
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {!isStreaming && (
                                        <Message
                                          from={message.role}
                                          className="w-full"
                                        >
                                          <MessageContent>
                                            <div className="inline-flex items-baseline gap-0.5">
                                              <MessageResponse>
                                                {part.text}
                                              </MessageResponse>
                                            </div>
                                          </MessageContent>
                                        </Message>
                                      )}
                                      {isStreaming && (
                                        <Message
                                          from={message.role}
                                          className="w-full"
                                        >
                                          <MessageContent>
                                            <div className="inline-flex items-baseline gap-0.5">
                                              <MessageResponse>
                                                {part.text}
                                              </MessageResponse>
                                            </div>
                                          </MessageContent>
                                        </Message>
                                      )}
                                      {/* Actions below the bubble */}
                                      {(isResponseComplete ||
                                        (message.role === 'user' &&
                                          isLastTextPart)) && (
                                        <div
                                          className={cn(
                                            'mt-1 flex items-center gap-2',
                                            message.role === 'user' &&
                                              'justify-end',
                                          )}
                                        >
                                          {message.role === 'assistant' &&
                                            regenCount > 0 && (
                                              <span className="text-muted-foreground text-xs">
                                                Regenerated {regenCount}x
                                              </span>
                                            )}
                                          {message.role === 'assistant' && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={handleRegenerate}
                                              className="h-7 w-7"
                                              title="Retry"
                                            >
                                              <RefreshCcwIcon className="size-3" />
                                            </Button>
                                          )}
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                            onClick={async () => {
                                              const partId = `${message.id}-${i}`;
                                              try {
                                                await navigator.clipboard.writeText(
                                                  part.text,
                                                );
                                                setCopiedMessagePartId(partId);
                                                setTimeout(() => {
                                                  setCopiedMessagePartId(null);
                                                }, 2000);
                                              } catch (error) {
                                                console.error('Failed to copy:', error);
                                              }
                                            }}
                                              className="h-7 w-7"
                                            title={
                                              copiedMessagePartId === `${message.id}-${i}`
                                                ? 'Copied!'
                                                : 'Copy'
                                            }
                                          >
                                            {copiedMessagePartId === `${message.id}-${i}` ? (
                                              <CheckIcon className="size-3 text-green-600" />
                                            ) : (
                                            <CopyIcon className="size-3" />
                                            )}
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                {message.role === 'user' && (
                                  <div className="mt-1 size-6 shrink-0" />
                                )}
                              </div>
                            );
                          }
                          case 'reasoning':
                            return (
                              <Reasoning
                                key={`${message.id}-${i}`}
                                className="w-full"
                                isStreaming={
                                  status === 'streaming' &&
                                  i === message.parts.length - 1 &&
                                  message.id === messages.at(-1)?.id
                                }
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            );
                          default:
                            if (part.type.startsWith('tool-')) {
                              const toolPart = part as ToolUIPart;
                              const toolName =
                                'toolName' in toolPart &&
                                typeof toolPart.toolName === 'string'
                                  ? toolPart.toolName
                                  : toolPart.type.replace('tool-', '');
                              const inProgressStates = new Set([
                                'input-streaming',
                                'input-available',
                                'approval-requested',
                              ]);
                              const isToolInProgress = inProgressStates.has(
                                toolPart.state as string,
                              );
                              const isGenerateChart =
                                toolPart.type === 'tool-generateChart';
                              const isSelectChartType =
                                toolPart.type === 'tool-selectChartType';
                              const isRunQuery = toolPart.type === 'tool-runQuery';
                              const isGetSchema = toolPart.type === 'tool-getTableSchema';
                              const isListViews = toolPart.type === 'tool-listViews';
                              const isViewSheet = toolPart.type === 'tool-viewSheet';

                              // Check if viewSheet is already in progress or completed in this message
                              const hasViewSheetInMessage = message.parts.some(
                                (p) =>
                                  p.type === 'tool-viewSheet' &&
                                  (p.state === 'output-available' ||
                                    p.state === 'input-available' ||
                                    p.state === 'input-streaming'),
                              );

                              // Parse chart type selection if it's selectChartType tool
                              let chartSelection: ChartTypeSelection | null = null;
                              if (isSelectChartType && toolPart.output) {
                                let parsedOutput: unknown = toolPart.output;
                                if (typeof toolPart.output === 'string') {
                                  try {
                                    parsedOutput = JSON.parse(toolPart.output);
                                  } catch {
                                    // Not JSON, will use regular ToolOutput
                                  }
                                }
                                if (
                                  parsedOutput &&
                                  typeof parsedOutput === 'object' &&
                                  !Array.isArray(parsedOutput) &&
                                  'chartType' in parsedOutput &&
                                  'reasoning' in parsedOutput
                                ) {
                                  chartSelection = parsedOutput as ChartTypeSelection;
                                }
                              }

                              // Parse chart output if it's generateChart tool
                              let chartConfig: ChartConfig | null = null;
                              if (isGenerateChart && toolPart.output) {
                                let parsedOutput: unknown = toolPart.output;
                                if (typeof toolPart.output === 'string') {
                                  try {
                                    parsedOutput = JSON.parse(toolPart.output);
                                  } catch {
                                    // Not JSON, will use regular ToolOutput
                                  }
                                }
                                if (
                                  parsedOutput &&
                                  typeof parsedOutput === 'object' &&
                                  !Array.isArray(parsedOutput) &&
                                  'chartType' in parsedOutput &&
                                  'data' in parsedOutput &&
                                  'config' in parsedOutput
                                ) {
                                  chartConfig = parsedOutput as ChartConfig;
                                }
                              }

                              // Parse SQL query result if it's runQuery tool
                              let sqlResult: SQLQueryResult | null = null;
                              let sqlQuery: string | undefined;
                              if (isRunQuery) {
                                // Extract query from input
                                if (
                                  toolPart.input &&
                                  typeof toolPart.input === 'object' &&
                                  'query' in toolPart.input
                                ) {
                                  sqlQuery =
                                    typeof toolPart.input.query === 'string'
                                      ? toolPart.input.query
                                      : undefined;
                                }

                                // Parse output
                                if (toolPart.output) {
                                  let parsedOutput: unknown = toolPart.output;
                                  if (typeof toolPart.output === 'string') {
                                    try {
                                      parsedOutput = JSON.parse(toolPart.output);
                                    } catch {
                                      // Not JSON, will use regular ToolOutput
                                    }
                                  }
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
                                    sqlResult = parsedOutput as SQLQueryResult;
                                  }
                                }
                              }

                              // Parse schema output if it's getSchema tool
                              let schemaData: SchemaData | null = null;
                              if (isGetSchema && toolPart.output) {
                                let parsedOutput: unknown = toolPart.output;
                                if (typeof toolPart.output === 'string') {
                                  try {
                                    parsedOutput = JSON.parse(toolPart.output);
                                  } catch {
                                    // Not JSON, will use regular ToolOutput
                                  }
                                }
                                if (
                                  parsedOutput &&
                                  typeof parsedOutput === 'object' &&
                                  !Array.isArray(parsedOutput) &&
                                  'schema' in parsedOutput &&
                                  parsedOutput.schema &&
                                  typeof parsedOutput.schema === 'object' &&
                                  'tables' in parsedOutput.schema
                                ) {
                                  schemaData = parsedOutput.schema as SchemaData;
                                }
                              }

                              // Parse views if it's listViews tool
                              let viewsData: { views: Array<{ viewName: string }>; message: string } | null = null;
                              if (isListViews && toolPart.output) {
                                let parsedOutput: unknown = toolPart.output;
                                if (typeof toolPart.output === 'string') {
                                  try {
                                    parsedOutput = JSON.parse(toolPart.output);
                                  } catch {
                                    // Not JSON, will use regular ToolOutput
                                  }
                                }
                                if (
                                  parsedOutput &&
                                  typeof parsedOutput === 'object' &&
                                  !Array.isArray(parsedOutput) &&
                                  'views' in parsedOutput &&
                                  Array.isArray(parsedOutput.views)
                                ) {
                                  viewsData = parsedOutput as {
                                    views: Array<{ viewName: string }>;
                                    message: string;
                                  };
                                }
                              }

                              // Parse view sheet if it's viewSheet tool
                              let viewSheetData: ViewSheetData | null = null;
                              if (isViewSheet && toolPart.output) {
                                let parsedOutput: unknown = toolPart.output;
                                if (typeof toolPart.output === 'string') {
                                  try {
                                    parsedOutput = JSON.parse(toolPart.output);
                                  } catch {
                                    // Not JSON, will use regular ToolOutput
                                  }
                                }
                                if (
                                  parsedOutput &&
                                  typeof parsedOutput === 'object' &&
                                  !Array.isArray(parsedOutput) &&
                                  'sheetName' in parsedOutput &&
                                  'columns' in parsedOutput &&
                                  'rows' in parsedOutput
                                ) {
                                  viewSheetData = parsedOutput as ViewSheetData;
                                }
                              }

                              return (
                                <Tool
                                  key={`${message.id}-${i}`}
                                  defaultOpen={
                                    toolPart.state === 'output-error' ||
                                    (isGenerateChart &&
                                      toolPart.state === 'output-available')
                                  }
                                >
                                  <ToolHeader
                                    title={toolName}
                                    type={toolPart.type}
                                    state={toolPart.state}
                                  />
                                  <ToolContent>
                                    {toolPart.input != null &&
                                    !isRunQuery &&
                                    !isGetSchema &&
                                    !isListViews &&
                                    !isViewSheet ? (
                                      <ToolInput input={toolPart.input} />
                                    ) : null}
                                    {isToolInProgress && (
                                      <div className="flex items-center justify-center py-8">
                                        <Loader size={20} />
                                      </div>
                                    )}
                                    {isSelectChartType && chartSelection ? (
                                      <div className="min-w-0 space-y-2 p-4">
                                        <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                          Chart Type Selection
                                        </h4>
                                        <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
                                          <ChartTypeSelector selection={chartSelection} />
                                        </div>
                                      </div>
                                    ) : isGenerateChart && chartConfig ? (
                                      <div className="min-w-0 space-y-2 p-4">
                                        <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                          Chart
                                        </h4>
                                        <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4 w-full">
                                          <ChartRenderer chartConfig={chartConfig} />
                                        </div>
                                      </div>
                                    ) : isGetSchema && schemaData ? (
                                      <div className="min-w-0 space-y-2 p-4">
                                        <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                          Schema
                                        </h4>
                                        <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
                                          <SchemaVisualizer schema={schemaData} />
                                        </div>
                                      </div>
                                    ) : isRunQuery && sqlResult ? (
                                      <div className="min-w-0 space-y-2 p-4">
                                        <SQLQueryVisualizer
                                          query={sqlQuery}
                                          result={sqlResult}
                                        />
                                      </div>
                                    ) : isListViews && viewsData ? (
                                      <div className="min-w-0 space-y-2 p-4">
                                        <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                          Available Sheets
                                        </h4>
                                        <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
                                          <AvailableSheetsVisualizer
                                            data={{
                                              sheets: viewsData.views.map((v) => ({
                                                name: v.viewName,
                                                type: 'view' as const,
                                              })),
                                              message: viewsData.message,
                                            }}
                                            isRequestInProgress={
                                              status === 'streaming' ||
                                              status === 'submitted' ||
                                              hasViewSheetInMessage
                                            }
                                            onViewSheet={(sheetName) => {
                                              sendMessage({
                                                text: `View sheet "${sheetName}"`,
                                              });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : isViewSheet && viewSheetData ? (
                                      <div
                                        ref={(el) => {
                                          if (el) {
                                            viewSheetRefs.current.set(
                                              `${message.id}-${i}`,
                                              el,
                                            );
                                          } else {
                                            viewSheetRefs.current.delete(
                                              `${message.id}-${i}`,
                                            );
                                          }
                                        }}
                                        className="min-w-0 space-y-2 p-4 scroll-mt-4"
                                      >
                                        <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                          Sheet View
                                        </h4>
                                        <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
                                          <ViewSheetVisualizer data={viewSheetData} />
                                        </div>
                                      </div>
                                    ) : isViewSheet && toolPart.errorText ? (
                                      <div className="min-w-0 space-y-2 p-4">
                                        <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                          Sheet View
                                        </h4>
                                        <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md p-4">
                                          <ViewSheetError
                                            errorText={toolPart.errorText}
                                            sheetName={
                                              toolPart.input &&
                                              typeof toolPart.input === 'object' &&
                                              'sheetName' in toolPart.input &&
                                              typeof toolPart.input.sheetName === 'string'
                                                ? toolPart.input.sheetName
                                                : undefined
                                            }
                                            availableSheets={
                                              viewsData?.views.map((v) => v.viewName)
                                            }
                                            onRetry={(sheetName: string) => {
                                              sendMessage({
                                                text: `View sheet "${sheetName}"`,
                                              });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <ToolOutput
                                        output={toolPart.output}
                                        errorText={toolPart.errorText}
                                      />
                                    )}
                                  </ToolContent>
                                </Tool>
                              );
                            }
                            return null;
                        }
                      })}
                    </div>
                  );
                })
              )}
              {status === 'submitted' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 flex items-start gap-3 duration-300">
                  <BotAvatar size={6} isLoading={true} className="mt-1 shrink-0" />
                  <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2">
                    <Message from="assistant" className="w-full">
                      <MessageContent>
                        <div className="inline-flex items-baseline gap-0.5">
                          <MessageResponse></MessageResponse>
                        </div>
                      </MessageContent>
                    </Message>
                  </div>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <div className="shrink-0">
          <PromptInputInner
            sendMessage={sendMessage}
            state={state}
            setState={setState}
            textareaRef={textareaRef}
            status={status}
            stop={stop}
            setMessages={setMessages}
            messages={messages}
            models={models}
            usage={usage}
            datasources={datasources}
            selectedDatasources={selectedDatasources}
            onDatasourceSelectionChange={onDatasourceSelectionChange}
            pluginLogoMap={pluginLogoMap}
            datasourcesLoading={datasourcesLoading}
          />
        </div>
      </div>
    </PromptInputProvider>
  );
}

function PromptInputInner({
  sendMessage,
  state,
  setState,
  textareaRef,
  status,
  stop,
  setMessages,
  messages,
  models,
  usage,
  datasources,
  selectedDatasources,
  onDatasourceSelectionChange,
  pluginLogoMap,
  datasourcesLoading,
}: {
  sendMessage: ReturnType<typeof useChat>['sendMessage'];
  state: { input: string; model: string; webSearch: boolean };
  setState: React.Dispatch<
    React.SetStateAction<{ input: string; model: string; webSearch: boolean }>
  >;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  status: ReturnType<typeof useChat>['status'];
  stop: ReturnType<typeof useChat>['stop'];
  setMessages: ReturnType<typeof useChat>['setMessages'];
  messages: ReturnType<typeof useChat>['messages'];
  models: { name: string; value: string }[];
  usage?: QweryContextProps;
  datasources?: DatasourceItem[];
  selectedDatasources?: string[];
  onDatasourceSelectionChange?: (datasourceIds: string[]) => void;
  pluginLogoMap?: Map<string, string>;
  datasourcesLoading?: boolean;
}) {
  const attachments = usePromptInputAttachments();
  const controller = usePromptInputController();
  const [isAborting, setIsAborting] = useState(false);

  useEffect(() => {
    if (status !== 'streaming' && isAborting) {
      setTimeout(() => setIsAborting(false), 0);
    }
  }, [status, isAborting]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (status === 'streaming' || status === 'submitted') {
      return;
    }

    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    controller.textInput.clear();
    setState((prev) => ({ ...prev, input: '' }));

    try {
      await sendMessage(
        {
          text: message.text || 'Sent with attachments',
          files: message.files,
        },
        {
          body: {
            model: state.model,
            webSearch: state.webSearch,
          },
        },
      );
      attachments.clear();
    } catch {
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleStop = async () => {
    setIsAborting(true);

    const lastAssistantMessage = messages
      .filter((m: UIMessage) => m.role === 'assistant')
      .at(-1);

    if (lastAssistantMessage) {
      setMessages((prev) =>
        prev.filter((m) => m.id !== lastAssistantMessage.id),
      );
    }
    stop();
  };

  return (
    <QweryPromptInput
      onSubmit={handleSubmit}
      input={state.input}
      setInput={(input) => setState((prev) => ({ ...prev, input }))}
      model={state.model}
      setModel={(model) => setState((prev) => ({ ...prev, model }))}
      models={models}
      status={isAborting ? undefined : status}
      textareaRef={textareaRef}
      onStop={handleStop}
      stopDisabled={isAborting}
      attachmentsCount={attachments.files.length}
      usage={usage}
      datasources={datasources}
      selectedDatasources={selectedDatasources}
      onDatasourceSelectionChange={onDatasourceSelectionChange}
      pluginLogoMap={pluginLogoMap}
      datasourcesLoading={datasourcesLoading}
    />
  );
}
