'use client';

import { UIMessage } from 'ai';
import { ChatStatus } from 'ai';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { BotAvatar } from '../bot-avatar';
import { Button } from '../../shadcn/button';
import { Textarea } from '../../shadcn/textarea';
import {
  CopyIcon,
  RefreshCcwIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
} from 'lucide-react';
import { Message, MessageContent } from '../../ai-elements/message';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../../ai-elements/sources';
import { ReasoningPart } from './message-parts';
import { StreamdownWithSuggestions } from './streamdown-with-suggestions';
import {
  UserMessageBubble,
  parseMessageWithContext,
} from './user-message-bubble';
import { DatasourceBadges, type DatasourceItem } from './datasource-badge';
import { DatasourceSelector } from './datasource-selector';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
} from '../../ai-elements/tool';
import { Loader } from '../../ai-elements/loader';
import { ToolUIPart } from 'ai';
import { TOOL_UI_CONFIG } from './utils/tool-ui-config';
import { ToolPart, TodoPart } from './message-parts';
import { SQLQueryVisualizer } from './sql-query-visualizer';
import { getUserFriendlyToolName } from './utils/tool-name';
import { getLastTodoPartIndex } from './utils/todo-parts';
import { isChatStreaming, getChatStatusConfig } from './utils/chat-status';
import type { NotebookCellType } from './utils/notebook-cell-type';
import { useToolVariant } from './tool-variant-context';
import { MessageFeedbackButton } from './message-feedback-button';
import {
  type FeedbackPayload,
  getFeedbackFromMetadata,
} from './feedback-types';

export interface MessageItemProps {
  message: UIMessage;
  messages: UIMessage[];
  status: ChatStatus | undefined;
  lastAssistantMessage: UIMessage | undefined;
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
}

function getExecutionTimeMs(part: ToolUIPart): number | undefined {
  if (!('executionTimeMs' in part)) {
    return undefined;
  }

  const value = part.executionTimeMs;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function MessageItemComponent({
  message,
  messages,
  status,
  lastAssistantMessage,
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
}: MessageItemProps) {
  const { t } = useTranslation('common');
  const { variant } = useToolVariant();
  const sourceParts = message.parts.filter(
    (part: { type: string }) => part.type === 'source-url',
  );

  const textParts = message.parts.filter((p) => p.type === 'text');
  const isLastAssistantMessage = message.id === lastAssistantMessage?.id;

  const lastTextPartIndex =
    textParts.length > 0
      ? message.parts.findLastIndex((p) => p.type === 'text')
      : -1;

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
                              'flex-end flex w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden',
                              isEditing ? 'max-w-full' : 'max-w-[80%]',
                            )}
                          >
                            {isEditing &&
                            normalizeUIRole(message.role) === 'user' ? (
                              (() => {
                                const { text: _cleanText, context } =
                                  parseMessageWithContext(part.text);
                                const hasContext =
                                  context?.lastAssistantResponse;

                                return (
                                  <>
                                    {(hasContext ||
                                      (datasources && pluginLogoMap)) && (
                                      <div className="mb-2 flex w-full min-w-0 items-center justify-between gap-2 overflow-x-hidden">
                                        {hasContext ? (
                                          <div className="text-muted-foreground line-clamp-1 min-w-0 flex-1 text-xs">
                                            <span className="font-medium">
                                              Context:{' '}
                                            </span>
                                            {context.lastAssistantResponse?.substring(
                                              0,
                                              100,
                                            )}
                                            {(context.lastAssistantResponse
                                              ?.length ?? 0) > 100 && '...'}
                                          </div>
                                        ) : (
                                          <div className="flex-1" />
                                        )}
                                        {datasources && pluginLogoMap && (
                                          <DatasourceSelector
                                            selectedDatasources={
                                              editDatasources
                                            }
                                            onSelectionChange={
                                              onEditDatasourcesChange
                                            }
                                            datasources={datasources}
                                            pluginLogoMap={pluginLogoMap}
                                            variant="badge"
                                          />
                                        )}
                                      </div>
                                    )}
                                    <div className="group w-full max-w-full min-w-0">
                                      <Message
                                        from={message.role}
                                        className="w-full max-w-full min-w-0"
                                      >
                                        <Textarea
                                          value={editText}
                                          onChange={(e) => {
                                            onEditTextChange(e.target.value);
                                          }}
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
                                          className="bg-muted/50 text-foreground border-primary/30 focus:border-primary min-h-[60px] w-full resize-none rounded-lg border-2 px-4 py-3 text-sm focus:outline-none"
                                          autoFocus
                                        />
                                      </Message>
                                      <div className="mt-2 flex items-center justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={onEditCancel}
                                          className="h-8 px-3"
                                        >
                                          <XIcon className="mr-1 size-3" />
                                          Cancel
                                        </Button>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={onEditSubmit}
                                          className="h-8 px-3"
                                        >
                                          <CheckIcon className="mr-1 size-3" />
                                          Save & Regenerate
                                        </Button>
                                      </div>
                                    </div>
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
                                        <div className="group w-full max-w-full min-w-0">
                                          <UserMessageBubble
                                            key={`${message.id}-${i}`}
                                            text={text}
                                            context={context}
                                            messageId={message.id}
                                            messages={messages}
                                            datasources={messageDatasources}
                                            pluginLogoMap={pluginLogoMap}
                                          />
                                          {isLastTextPart && (
                                            <div className="mt-1 flex items-center justify-end gap-1">
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
                                                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                                title={t('sidebar.edit')}
                                              >
                                                <PencilIcon className="size-3" />
                                              </Button>
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
                                                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
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
                                        <div className="group w-full max-w-full min-w-0">
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
                                                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                                  title={t('sidebar.edit')}
                                                >
                                                  <PencilIcon className="size-3" />
                                                </Button>
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
                                                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
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
                                            >
                                              {part.text}
                                            </StreamdownWithSuggestions>
                                          </div>
                                        </MessageContent>
                                      </Message>
                                    )}
                                  </>
                                )}
                                {/* Actions below the bubble - only for assistant messages */}
                                {isResponseComplete &&
                                  message.role === 'assistant' && (
                                    <div className="mt-1 flex items-center gap-2">
                                      {statusConfig.showRegenerateButton &&
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
                        className="flex w-full max-w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden pr-2 sm:pr-4"
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
                              >
                                {part.text}
                              </StreamdownWithSuggestions>
                            </MessageContent>
                          </Message>
                        )}
                        {/* Actions below the bubble */}
                        {isResponseComplete && (
                          <div className="mt-1 flex items-center gap-2">
                            {message.role === 'assistant' &&
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
                      const inProgressStates = new Set([
                        'input-streaming',
                        'input-available',
                        'approval-requested',
                      ]);
                      const isToolInProgress = inProgressStates.has(
                        toolPart.state as string,
                      );

                      if (isToolInProgress) {
                        const toolName =
                          'toolName' in toolPart &&
                          typeof toolPart.toolName === 'string'
                            ? getUserFriendlyToolName(
                                `tool-${toolPart.toolName}`,
                              )
                            : getUserFriendlyToolName(toolPart.type);
                        const runQueryInput =
                          toolPart.type === 'tool-runQuery'
                            ? (toolPart.input as { query?: string } | null)
                            : null;
                        const showRunQuerySql =
                          runQueryInput?.query != null &&
                          runQueryInput.query !== '';
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="flex w-full max-w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden"
                          >
                            <Tool
                              defaultOpen={TOOL_UI_CONFIG.DEFAULT_OPEN}
                              variant={variant}
                              className={cn(
                                'max-w-[min(43.2rem,calc(100%-3rem))]',
                                'mx-4 sm:mx-6',
                              )}
                            >
                              <ToolHeader
                                title={toolName}
                                type={toolPart.type}
                                state={toolPart.state}
                                executionTimeMs={getExecutionTimeMs(toolPart)}
                                variant={variant}
                              />
                              <ToolContent variant={variant}>
                                {showRunQuerySql ? (
                                  <SQLQueryVisualizer
                                    query={runQueryInput!.query}
                                    result={undefined}
                                    showPasteButton={false}
                                    chartExecutionOverride={false}
                                  />
                                ) : toolPart.input != null ? (
                                  <ToolInput input={toolPart.input} />
                                ) : null}
                                <div className="flex items-center justify-center py-8">
                                  <Loader size={20} />
                                </div>
                              </ToolContent>
                            </Tool>
                          </div>
                        );
                      }

                      // Use ToolPart component for completed tools (includes visualizers)
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="flex w-full max-w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden"
                        >
                          <ToolPart
                            part={toolPart}
                            messageId={message.id}
                            index={i}
                            onPasteToNotebook={onPasteToNotebook}
                            notebookContext={notebookContext}
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

export const MessageItem = memo(MessageItemComponent, (prev, next) => {
  if (prev.message.id !== next.message.id) {
    return false;
  }

  if (prev.message.parts.length !== next.message.parts.length) {
    return false;
  }

  if (prev.status !== next.status) {
    return false;
  }

  if (prev.editingMessageId !== next.editingMessageId) {
    return false;
  }

  if (prev.editText !== next.editText) {
    return false;
  }

  if (prev.copiedMessagePartId !== next.copiedMessagePartId) {
    return false;
  }

  // Re-render when metadata changes (e.g. feedback optimistic update)
  if (prev.message.metadata !== next.message.metadata) {
    return false;
  }

  const isLastMessage = prev.message.id === prev.messages.at(-1)?.id;
  if (
    isLastMessage &&
    (isChatStreaming(prev.status) || isChatStreaming(next.status))
  ) {
    return false;
  }

  if (prev.messages.length !== next.messages.length) {
    const messageStillExists = next.messages.some(
      (m) => m.id === prev.message.id,
    );
    if (!messageStillExists) {
      return false;
    }
    if (isLastMessage) {
      return false;
    }
  }

  return true;
});
