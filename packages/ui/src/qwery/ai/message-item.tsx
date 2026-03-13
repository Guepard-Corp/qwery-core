'use client';

import { UIMessage } from 'ai';
import { ChatStatus } from 'ai';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { BotAvatar } from '../bot-avatar';
import { Button } from '../../shadcn/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '../../shadcn/input-group';
import {
  CopyIcon,
  RefreshCcwIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
  MoreVertical as MoreVerticalIcon,
  FileText as FileTextIcon,
  Archive as ArchiveIcon,
  ArrowUp,
} from 'lucide-react';
import { Message, MessageContent } from '../../ai-elements/message';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../../ai-elements/sources';
import { ModelSelector } from './model-selector';
import { ReasoningPart } from './message-parts';
import { StreamdownWithSuggestions } from './streamdown-with-suggestions';
import {
  UserMessageBubble,
  parseMessageWithContext,
} from './user-message-bubble';
import { DatasourceBadges, type DatasourceItem } from './datasource-badge';
import { DatasourceSelector } from './datasource-selector';
import { ToolUIPart } from 'ai';
import { TodoPart, getExecutionTimeMsFromMessageParts } from './message-parts';
import { ToolWithTaskDelimiter } from './tool-with-task-delimiter';
import { getLastTodoPartIndex } from './utils/todo-parts';
import {
  isChatStreaming,
  isChatActive,
  isChatIdle,
  getChatStatusConfig,
} from './utils/chat-status';
import type { NotebookCellType } from './utils/notebook-cell-type';
import { useToolVariant } from './tool-variant-context';
import { MessageFeedbackButton } from './message-feedback-button';
import {
  type FeedbackPayload,
  getFeedbackFromMetadata,
} from './feedback-types';
import {
  messagesToMarkdown,
  downloadMarkdown,
} from './utils/export-to-markdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';

export interface MessageItemProps {
  message: UIMessage;
  messages: UIMessage[];
  status: ChatStatus | undefined;
  lastAssistantMessage: UIMessage | undefined;
  model?: string;
  setModel?: (model: string) => void;
  models?: { name: string; value: string }[];
  editingMessageId: string | null;
  editText: string;
  editDatasources: string[];
  copiedMessagePartId: string | null;
  datasources?: DatasourceItem[];
  selectedDatasources?: string[];
  pluginLogoMap?: Map<string, string>;
  notebookContext?: {
    cellId?: number;
    notebookCellType?: NotebookCellType;
    datasourceId?: string;
  };
  onEditStart: (
    messageId: string,
    text: string,
    datasourceIds: string[],
  ) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onEditTextChange: (text: string) => void;
  onEditDatasourcesChange: (datasourceIds: string[]) => void;
  onRegenerate: () => void;
  onCopyPart: (partId: string) => void;
  sendMessage?: ReturnType<
    typeof import('@ai-sdk/react').useChat
  >['sendMessage'];
  onToolApproval?: (approvalId: string, approved: boolean) => void;
  onPasteToNotebook?: (
    sqlQuery: string,
    notebookCellType: NotebookCellType,
    datasourceId: string,
    cellId: number,
  ) => void;
  onSubmitFeedback?: (
    messageId: string,
    feedback: FeedbackPayload,
  ) => Promise<void>;
  openToolPartKeys?: Set<string> | null;
  onToolPartOpenChange?: (key: string, open: boolean) => void;
  scrollToBottom?: () => void;
  scrollToMessageId?: (messageId: string) => void;
  webSearch?: boolean;
  onBeforeSuggestionSend?: (
    text: string,
    metadata?: import('./utils/suggestion-pattern').SuggestionMetadata,
  ) => Promise<boolean>;
  onDatasourceNameClick?: (id: string, name: string) => void;
  onTableNameClick?: (
    datasourceId: string,
    datasourceName: string,
    schema: string,
    tableName: string,
  ) => void;
  getDatasourceTooltip?: (id: string) => string;
  conversationTitle?: string;
}

function getExecutionTimeMs(
  part: ToolUIPart,
  message: UIMessage,
): number | undefined {
  if (!('executionTimeMs' in part)) {
    const toolCallId =
      'toolCallId' in part && typeof part.toolCallId === 'string'
        ? part.toolCallId
        : undefined;
    return getExecutionTimeMsFromMessageParts(message.parts, toolCallId);
  }

  const value = part.executionTimeMs;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const toolCallId =
    'toolCallId' in part && typeof part.toolCallId === 'string'
      ? part.toolCallId
      : undefined;
  return getExecutionTimeMsFromMessageParts(message.parts, toolCallId);
}

function MessageItemComponent({
  message,
  messages,
  status,
  lastAssistantMessage,
  model,
  setModel,
  models,
  editingMessageId,
  editText,
  editDatasources,
  copiedMessagePartId,
  datasources,
  selectedDatasources,
  pluginLogoMap,
  notebookContext,
  onEditStart,
  onEditSubmit,
  onEditCancel,
  onEditTextChange,
  onEditDatasourcesChange,
  onRegenerate,
  onCopyPart,
  sendMessage,
  onPasteToNotebook,
  onSubmitFeedback,
  openToolPartKeys,
  onToolPartOpenChange,
  scrollToBottom,
  scrollToMessageId,
  webSearch,
  onBeforeSuggestionSend,
  onDatasourceNameClick,
  onTableNameClick,
  getDatasourceTooltip,
  onToolApproval,
  conversationTitle,
}: MessageItemProps) {
  const { t } = useTranslation('common');
  const { t: tChat } = useTranslation('chat');
  useToolVariant();
  const sourceParts = message.parts.filter(
    (part: { type: string }) => part.type === 'source-url',
  );

  const getChartSvg = (messageId: string, partIndex: number): string | null => {
    const element = document.querySelector(
      `[data-export-key="${messageId}-${partIndex}"] svg`,
    );
    if (!element) return null;
    try {
      return new XMLSerializer().serializeToString(element as SVGElement);
    } catch {
      return null;
    }
  };

  const handleExportResponse = () => {
    const messageIndex = messages.findIndex((m) => m.id === message.id);
    let userMessage: (typeof messages)[0] | null = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (normalizeUIRole(messages[i]?.role) === 'user') {
        userMessage = messages[i] ?? null;
        break;
      }
    }
    const messagesToExport = userMessage ? [userMessage, message] : [message];

    const md = messagesToMarkdown(messagesToExport, undefined, { getChartSvg });
    const date = new Date().toISOString().slice(0, 10);
    const filename = `response-${date}-${message.id.slice(0, 8)}`;
    downloadMarkdown(md, filename);
  };

  const handleExportChat = () => {
    const messageIndex = messages.findIndex((m) => m.id === message.id);
    const messagesUpToThisPoint = messages.slice(0, messageIndex + 1);
    const md = messagesToMarkdown(messagesUpToThisPoint, conversationTitle, {
      getChartSvg,
    });
    const filename =
      conversationTitle || `chat-${new Date().toISOString().slice(0, 10)}`;
    downloadMarkdown(md, filename);
  };

  const textParts = message.parts.filter((p) => p.type === 'text');
  const isLastAssistantMessage = message.id === lastAssistantMessage?.id;

  const lastTextPartIndex =
    textParts.length > 0
      ? message.parts.findLastIndex((p) => p.type === 'text')
      : -1;

  const selectedDatasourceItems =
    datasources && selectedDatasources?.length
      ? datasources.filter((ds) => selectedDatasources.includes(ds.id))
      : undefined;

  return (
    <div
      data-message-id={message.id}
      className="w-full max-w-full min-w-0 overflow-x-hidden py-2"
      style={{ width: '100%', maxWidth: '100%' }}
    >
      {message.role === 'assistant' && sourceParts.length > 0 && (
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
      {(() => {
        const isAssistantMessage =
          normalizeUIRole(message.role) === 'assistant';
        const hasAssistantParts =
          isAssistantMessage && message.parts.length > 0;

        return (
          <div
            className={cn(
              hasAssistantParts &&
                'animate-in fade-in slide-in-from-bottom-4 mt-4 flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden duration-300',
            )}
          >
            {hasAssistantParts && (
              <div className="pointer-events-none mt-1 shrink-0 self-start">
                <BotAvatar size={6} isLoading={false} />
              </div>
            )}
            <div
              className={cn(
                hasAssistantParts &&
                  'flex min-w-0 flex-1 flex-col gap-2 pr-2 sm:pr-4',
                !hasAssistantParts && 'w-full',
              )}
            >
              {(() => {
                const lastTodoIndex = getLastTodoPartIndex(message.parts);
                return lastTodoIndex !== null ? (
                  <div
                    key={`${message.id}-todo`}
                    className="flex w-full max-w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden"
                  >
                    <TodoPart
                      part={
                        message.parts[lastTodoIndex] as ToolUIPart & {
                          type: 'tool-todowrite' | 'tool-todoread';
                        }
                      }
                      messageId={message.id}
                      index={lastTodoIndex}
                    />
                  </div>
                ) : null;
              })()}
              {message.parts.map((part, i: number) => {
                if (
                  part.type === 'tool-todowrite' ||
                  part.type === 'tool-todoread'
                ) {
                  return null;
                }
                const isLastTextPart =
                  part.type === 'text' && i === lastTextPartIndex;
                const isStreaming =
                  isChatStreaming(status) &&
                  isLastAssistantMessage &&
                  isLastTextPart;
                const isResponseComplete =
                  !isStreaming && isLastAssistantMessage && isLastTextPart;
                const statusConfig = getChatStatusConfig(status);
                switch (part.type) {
                  case 'text': {
                    const isEditing = editingMessageId === message.id;

                    if (normalizeUIRole(message.role) === 'user') {
                      const messageDatasources = (() => {
                        if (
                          message.metadata &&
                          typeof message.metadata === 'object'
                        ) {
                          const metadata = message.metadata as Record<
                            string,
                            unknown
                          >;
                          if (
                            'datasources' in metadata &&
                            Array.isArray(metadata.datasources)
                          ) {
                            const metadataDatasources = (
                              metadata.datasources as string[]
                            )
                              .map((dsId) =>
                                datasources?.find((ds) => ds.id === dsId),
                              )
                              .filter(
                                (ds): ds is DatasourceItem => ds !== undefined,
                              );
                            if (metadataDatasources.length > 0) {
                              return metadataDatasources;
                            }
                          }
                        }

                        const lastUserMessage = [...messages]
                          .reverse()
                          .find((msg) => normalizeUIRole(msg.role) === 'user');

                        const isLastUserMessage =
                          lastUserMessage?.id === message.id;

                        if (
                          isLastUserMessage &&
                          selectedDatasources &&
                          selectedDatasources.length > 0
                        ) {
                          return selectedDatasources
                            .map((dsId) =>
                              datasources?.find((ds) => ds.id === dsId),
                            )
                            .filter(
                              (ds): ds is DatasourceItem => ds !== undefined,
                            );
                        }

                        return undefined;
                      })();

                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className={cn(
                            'animate-in fade-in slide-in-from-bottom-4 flex max-w-full min-w-0 items-start justify-end gap-3 overflow-x-hidden duration-300',
                          )}
                        >
                          <div
                            className={cn(
                              'group flex-end flex w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden',
                              isEditing ? 'max-w-full' : 'max-w-[80%]',
                            )}
                          >
                            {isEditing &&
                            normalizeUIRole(message.role) === 'user' ? (
                              (() => {
                                return (
                                  <>
                                    {datasources && pluginLogoMap && (
                                      <div className="mb-2 flex w-full min-w-0 justify-end overflow-x-hidden">
                                        <DatasourceSelector
                                          selectedDatasources={editDatasources}
                                          onSelectionChange={
                                            onEditDatasourcesChange
                                          }
                                          datasources={datasources}
                                          pluginLogoMap={pluginLogoMap}
                                          variant="badge"
                                        />
                                      </div>
                                    )}
                                    <InputGroup className="overflow-hidden">
                                      <InputGroupTextarea
                                        value={editText}
                                        onChange={(e) =>
                                          onEditTextChange(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === 'Enter' &&
                                            (e.metaKey || e.ctrlKey)
                                          ) {
                                            e.preventDefault();
                                            onEditSubmit();
                                          } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            onEditCancel();
                                          }
                                        }}
                                        className="field-sizing-content max-h-64 min-h-16 px-3"
                                        autoFocus
                                      />
                                      <InputGroupAddon
                                        align="block-end"
                                        className="flex min-w-0 justify-between gap-1"
                                      >
                                        <div className="flex min-w-0 flex-1 items-center gap-1">
                                          {models && setModel && model && (
                                            <ModelSelector
                                              models={models}
                                              value={model}
                                              onValueChange={setModel}
                                            />
                                          )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={onEditCancel}
                                            className="h-8 w-8"
                                            aria-label="Cancel edit"
                                          >
                                            <XIcon className="size-4" />
                                          </Button>
                                          <Button
                                            variant="default"
                                            size="icon"
                                            onClick={onEditSubmit}
                                            className="h-8 w-8"
                                            aria-label="Save and regenerate"
                                          >
                                            <ArrowUp className="size-4" />
                                          </Button>
                                        </div>
                                      </InputGroupAddon>
                                    </InputGroup>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                {normalizeUIRole(message.role) === 'user' ? (
                                  (() => {
                                    const { text, context } =
                                      parseMessageWithContext(part.text);

                                    if (context) {
                                      return (
                                        <div className="group/msg w-full max-w-full min-w-0">
                                          <UserMessageBubble
                                            key={`${message.id}-${i}`}
                                            text={text}
                                            context={context}
                                            messageId={message.id}
                                            messages={messages}
                                            datasources={messageDatasources}
                                            pluginLogoMap={pluginLogoMap}
                                            scrollToMessageId={
                                              scrollToMessageId
                                            }
                                          />
                                          {isLastTextPart && (
                                            <div className="mt-1 flex items-center justify-end gap-1">
                                              {!isChatActive(status) && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() =>
                                                    onEditStart(
                                                      message.id,
                                                      text,
                                                      messageDatasources?.map(
                                                        (ds) => ds.id,
                                                      ) ?? [],
                                                    )
                                                  }
                                                  className="h-7 w-7 opacity-0 transition-opacity group-hover/msg:opacity-100"
                                                  title={t('sidebar.edit')}
                                                >
                                                  <PencilIcon className="size-3" />
                                                </Button>
                                              )}
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={async () => {
                                                  const partId = `${message.id}-${i}`;
                                                  try {
                                                    await navigator.clipboard.writeText(
                                                      text,
                                                    );
                                                    onCopyPart(partId);
                                                    setTimeout(() => {
                                                      onCopyPart('');
                                                    }, 2000);
                                                  } catch (error) {
                                                    console.error(
                                                      'Failed to copy:',
                                                      error,
                                                    );
                                                  }
                                                }}
                                                className="h-7 w-7 opacity-0 transition-opacity group-hover/msg:opacity-100"
                                                title={
                                                  copiedMessagePartId ===
                                                  `${message.id}-${i}`
                                                    ? t('sidebar.copied')
                                                    : t('sidebar.copy')
                                                }
                                              >
                                                {copiedMessagePartId ===
                                                `${message.id}-${i}` ? (
                                                  <CheckIcon className="size-3 text-green-600" />
                                                ) : (
                                                  <CopyIcon className="size-3" />
                                                )}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="flex flex-col items-end gap-1.5">
                                        {messageDatasources &&
                                          messageDatasources.length > 0 && (
                                            <div className="flex w-full max-w-[80%] min-w-0 justify-end overflow-x-hidden">
                                              <DatasourceBadges
                                                datasources={messageDatasources}
                                                pluginLogoMap={pluginLogoMap}
                                              />
                                            </div>
                                          )}
                                        <div className="group/msg w-full max-w-full min-w-0">
                                          <Message
                                            key={`${message.id}-${i}`}
                                            from={message.role}
                                            className="w-full max-w-full min-w-0"
                                          >
                                            <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                                              <div className="overflow-wrap-anywhere inline-flex min-w-0 items-baseline gap-0.5 break-words">
                                                {part.text}
                                              </div>
                                            </MessageContent>
                                          </Message>
                                          {/* Edit and Copy buttons for user messages - only visible on hover */}
                                          {normalizeUIRole(message.role) ===
                                            'user' &&
                                            isLastTextPart && (
                                              <div className="mt-1 flex items-center justify-end gap-1">
                                                {!isChatActive(status) && (
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                      onEditStart(
                                                        message.id,
                                                        part.text,
                                                        messageDatasources?.map(
                                                          (ds) => ds.id,
                                                        ) ?? [],
                                                      )
                                                    }
                                                    className="h-7 w-7 opacity-0 transition-opacity group-hover/msg:opacity-100"
                                                    title={t('sidebar.edit')}
                                                  >
                                                    <PencilIcon className="size-3" />
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
                                                      onCopyPart(partId);
                                                      setTimeout(() => {
                                                        onCopyPart('');
                                                      }, 2000);
                                                    } catch (error) {
                                                      console.error(
                                                        'Failed to copy:',
                                                        error,
                                                      );
                                                    }
                                                  }}
                                                  className="h-7 w-7 opacity-0 transition-opacity group-hover/msg:opacity-100"
                                                  title={
                                                    copiedMessagePartId ===
                                                    `${message.id}-${i}`
                                                      ? t('sidebar.copied')
                                                      : t('sidebar.copy')
                                                  }
                                                >
                                                  {copiedMessagePartId ===
                                                  `${message.id}-${i}` ? (
                                                    <CheckIcon className="size-3 text-green-600" />
                                                  ) : (
                                                    <CopyIcon className="size-3" />
                                                  )}
                                                </Button>
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <>
                                    {!isStreaming && (
                                      <Message
                                        from={message.role}
                                        className="w-full max-w-full min-w-0"
                                      >
                                        <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                                          <div className="overflow-wrap-anywhere inline-flex min-w-0 items-baseline gap-0.5 break-words">
                                            <StreamdownWithSuggestions
                                              sendMessage={sendMessage}
                                              messages={messages}
                                              currentMessageId={message.id}
                                              scrollToBottom={scrollToBottom}
                                              disabled={!isChatIdle(status)}
                                              isLastAgentResponse={
                                                isLastAssistantMessage
                                              }
                                              onBeforeSuggestionSend={
                                                onBeforeSuggestionSend
                                              }
                                              onDatasourceNameClick={
                                                onDatasourceNameClick
                                              }
                                              getDatasourceTooltip={
                                                getDatasourceTooltip
                                              }
                                            >
                                              {part.text}
                                            </StreamdownWithSuggestions>
                                          </div>
                                        </MessageContent>
                                      </Message>
                                    )}
                                    {isStreaming && (
                                      <Message
                                        from={message.role}
                                        className="w-full max-w-full min-w-0"
                                      >
                                        <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                                          <div className="overflow-wrap-anywhere inline-flex min-w-0 items-baseline gap-0.5 break-words">
                                            <StreamdownWithSuggestions
                                              sendMessage={sendMessage}
                                              messages={messages}
                                              currentMessageId={message.id}
                                              scrollToBottom={scrollToBottom}
                                              disabled={!isChatIdle(status)}
                                              isLastAgentResponse={
                                                isLastAssistantMessage
                                              }
                                              onBeforeSuggestionSend={
                                                onBeforeSuggestionSend
                                              }
                                              onDatasourceNameClick={
                                                onDatasourceNameClick
                                              }
                                              getDatasourceTooltip={
                                                getDatasourceTooltip
                                              }
                                            >
                                              {part.text}
                                            </StreamdownWithSuggestions>
                                          </div>
                                        </MessageContent>
                                      </Message>
                                    )}
                                  </>
                                )}
                                {/* Actions below the bubble - for every assistant message */}
                                {message.role === 'assistant' &&
                                  isLastTextPart && (
                                    <div
                                      className={cn(
                                        'text-muted-foreground mt-1 flex items-center gap-2',
                                        !isLastAssistantMessage &&
                                          'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100',
                                      )}
                                    >
                                      {isResponseComplete &&
                                        statusConfig.showRegenerateButton &&
                                        !(
                                          isLastAssistantMessage &&
                                          statusConfig.hideRegenerateOnLastMessage
                                        ) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={onRegenerate}
                                            className="h-7 w-7"
                                            title="Retry"
                                          >
                                            <RefreshCcwIcon className="size-3" />
                                          </Button>
                                        )}
                                      {onSubmitFeedback && (
                                        <MessageFeedbackButton
                                          messageId={message.id}
                                          onSubmitFeedback={onSubmitFeedback}
                                          existingFeedback={getFeedbackFromMetadata(
                                            message.metadata,
                                          )}
                                        />
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
                                            onCopyPart(partId);
                                            setTimeout(() => {
                                              onCopyPart('');
                                            }, 2000);
                                          } catch (error) {
                                            console.error(
                                              'Failed to copy:',
                                              error,
                                            );
                                          }
                                        }}
                                        className="h-7 w-7"
                                        title={
                                          copiedMessagePartId ===
                                          `${message.id}-${i}`
                                            ? 'Copied!'
                                            : 'Copy'
                                        }
                                      >
                                        {copiedMessagePartId ===
                                        `${message.id}-${i}` ? (
                                          <CheckIcon className="size-3 text-green-600" />
                                        ) : (
                                          <CopyIcon className="size-3" />
                                        )}
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            title="Export"
                                          >
                                            <MoreVerticalIcon className="size-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            onClick={handleExportResponse}
                                          >
                                            <FileTextIcon className="mr-2 size-4" />
                                            {tChat('export_response', {
                                              defaultValue: 'Export response',
                                            })}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={handleExportChat}
                                          >
                                            <ArchiveIcon className="mr-2 size-4" />
                                            {tChat('export_chat', {
                                              defaultValue: 'Export chat',
                                            })}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                              </>
                            )}
                          </div>
                          {normalizeUIRole(message.role) === 'user' && (
                            <div className="mt-1 size-6 shrink-0" />
                          )}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className="group flex w-full max-w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden pr-2 sm:pr-4"
                      >
                        {!isStreaming && (
                          <Message
                            from={message.role}
                            className="w-full max-w-full min-w-0"
                          >
                            <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                              <StreamdownWithSuggestions
                                sendMessage={sendMessage}
                                messages={messages}
                                currentMessageId={message.id}
                                scrollToBottom={scrollToBottom}
                                disabled={!isChatIdle(status)}
                                isLastAgentResponse={isLastAssistantMessage}
                                onBeforeSuggestionSend={onBeforeSuggestionSend}
                                onDatasourceNameClick={onDatasourceNameClick}
                                getDatasourceTooltip={getDatasourceTooltip}
                              >
                                {part.text}
                              </StreamdownWithSuggestions>
                            </MessageContent>
                          </Message>
                        )}
                        {isStreaming && (
                          <Message
                            from={message.role}
                            className="w-full max-w-full min-w-0"
                          >
                            <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                              <StreamdownWithSuggestions
                                sendMessage={sendMessage}
                                messages={messages}
                                currentMessageId={message.id}
                                scrollToBottom={scrollToBottom}
                                disabled={!isChatIdle(status)}
                                isLastAgentResponse={isLastAssistantMessage}
                                onBeforeSuggestionSend={onBeforeSuggestionSend}
                                onDatasourceNameClick={onDatasourceNameClick}
                                getDatasourceTooltip={getDatasourceTooltip}
                              >
                                {part.text}
                              </StreamdownWithSuggestions>
                            </MessageContent>
                          </Message>
                        )}
                        {/* Actions below the bubble - for every assistant message */}
                        {message.role === 'assistant' && isLastTextPart && (
                          <div
                            className={cn(
                              'text-muted-foreground mt-1 flex items-center gap-2',
                              !isLastAssistantMessage &&
                                'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100',
                            )}
                          >
                            {isResponseComplete &&
                              statusConfig.showRegenerateButton &&
                              !(
                                isLastAssistantMessage &&
                                statusConfig.hideRegenerateOnLastMessage
                              ) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={onRegenerate}
                                  className="h-7 w-7"
                                  title="Retry"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </Button>
                              )}
                            {message.role === 'assistant' &&
                              onSubmitFeedback && (
                                <MessageFeedbackButton
                                  messageId={message.id}
                                  onSubmitFeedback={onSubmitFeedback}
                                  existingFeedback={getFeedbackFromMetadata(
                                    message.metadata,
                                  )}
                                />
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
                                  onCopyPart(partId);
                                  setTimeout(() => {
                                    onCopyPart('');
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
                            {message.role === 'assistant' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Export"
                                  >
                                    <MoreVerticalIcon className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={handleExportResponse}
                                  >
                                    <FileTextIcon className="mr-2 size-4" />
                                    {tChat('export_response', {
                                      defaultValue: 'Export response',
                                    })}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={handleExportChat}>
                                    <ArchiveIcon className="mr-2 size-4" />
                                    {tChat('export_chat', {
                                      defaultValue: 'Export chat',
                                    })}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  case 'reasoning':
                    return (
                      <ReasoningPart
                        key={`${message.id}-${i}`}
                        part={part as { type: 'reasoning'; text: string }}
                        messageId={message.id}
                        index={i}
                        isStreaming={
                          isChatStreaming(status) &&
                          i === message.parts.length - 1 &&
                          message.id === messages.at(-1)?.id
                        }
                        sendMessage={sendMessage}
                        messages={messages}
                      />
                    );
                  default:
                    if (part.type.startsWith('tool-')) {
                      const toolPart = part as ToolUIPart;
                      const toolPartKey = `${message.id}-${i}`;

                      return (
                        <div
                          key={toolPartKey}
                          className="flex w-full max-w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden"
                        >
                          <ToolWithTaskDelimiter
                            parts={message.parts}
                            partIndex={i}
                            part={toolPart}
                            messageId={message.id}
                            index={i}
                            executionTimeMs={getExecutionTimeMs(
                              toolPart,
                              message,
                            )}
                            open={
                              openToolPartKeys !== undefined &&
                              openToolPartKeys !== null
                                ? openToolPartKeys.has(toolPartKey)
                                : undefined
                            }
                            onOpenChange={
                              onToolPartOpenChange
                                ? (open) =>
                                    onToolPartOpenChange(toolPartKey, open)
                                : undefined
                            }
                            defaultOpenWhenUncontrolled={
                              i === message.parts.length - 1
                            }
                            onPasteToNotebook={onPasteToNotebook}
                            notebookContext={notebookContext}
                            onToolApproval={onToolApproval}
                            pluginLogoMap={pluginLogoMap}
                            selectedDatasourceItems={selectedDatasourceItems}
                            messages={messages}
                            datasources={datasources}
                            onDatasourceNameClick={onDatasourceNameClick}
                            onTableNameClick={onTableNameClick}
                            webSearch={webSearch}
                          />
                        </div>
                      );
                    }
                    return null;
                }
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export const MessageItem = memo(MessageItemComponent);
