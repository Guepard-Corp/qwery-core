'use client';

import { UIMessage } from 'ai';
import { ChatStatus } from 'ai';
import { memo } from 'react';
import { cn } from '../../lib/utils';
import { BotAvatar } from '../bot-avatar';
import { Button } from '../../shadcn/button';
import { Textarea } from '../../shadcn/textarea';
import { CopyIcon, RefreshCcwIcon, CheckIcon, XIcon } from 'lucide-react';
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
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
} from '../../ai-elements/tool';
import { Loader } from '../../ai-elements/loader';
import { ToolUIPart } from 'ai';
import { TOOL_UI_CONFIG } from './tool-ui-config';
import { ToolPart } from './message-parts';
import { getUserFriendlyToolName } from './utils/tool-name';
import { isChatStreaming, getChatStatusConfig } from './utils/chat-status';
import type { NotebookCellType } from './utils/notebook-cell-type';
import { useToolVariant } from './tool-variant-context';

export interface MessageItemProps {
  message: UIMessage;
  messages: UIMessage[];
  status: ChatStatus | undefined;
  lastAssistantMessage: UIMessage | undefined;
  editingMessageId: string | null;
  editText: string;
  copiedMessagePartId: string | null;
  datasources?: DatasourceItem[];
  selectedDatasources?: string[];
  pluginLogoMap?: Map<string, string>;
  notebookContext?: {
    cellId?: number;
    notebookCellType?: NotebookCellType;
    datasourceId?: string;
  };
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onEditTextChange: (text: string) => void;
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
}

function MessageItemComponent({
  message,
  messages,
  status,
  lastAssistantMessage,
  editingMessageId,
  editText,
  copiedMessagePartId,
  datasources,
  selectedDatasources,
  pluginLogoMap,
  notebookContext,
  onEditSubmit,
  onEditCancel,
  onEditTextChange,
  onRegenerate,
  onCopyPart,
  sendMessage,
  onPasteToNotebook,
}: MessageItemProps) {
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
        const isAssistantMessage = normalizeUIRole(message.role) === 'assistant';
        const firstPartIndex = isAssistantMessage ? 0 : -1;
        const hasAssistantParts = isAssistantMessage && message.parts.length > 0;
        
        return (
          <div className={cn(
            hasAssistantParts && 'flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300'
          )}>
            {hasAssistantParts && (
              <div className="mt-1 shrink-0 pointer-events-none self-start">
                <BotAvatar size={6} isLoading={false} />
              </div>
            )}
            <div className={cn(
              hasAssistantParts && 'flex-1 flex flex-col gap-2 min-w-0',
              !hasAssistantParts && 'w-full'
            )}>
              {message.parts.map((part, i: number) => {
                const isLastTextPart = part.type === 'text' && i === lastTextPartIndex;
                const isStreaming =
                  isChatStreaming(status) && isLastAssistantMessage && isLastTextPart;
                const isResponseComplete =
                  !isStreaming && isLastAssistantMessage && isLastTextPart;
                const statusConfig = getChatStatusConfig(status);
                switch (part.type) {
          case 'text': {
            const isEditing = editingMessageId === message.id;
            
            if (normalizeUIRole(message.role) === 'user') {
              return (
                <div
                  key={`${message.id}-${i}`}
                  className={cn(
                    'flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden justify-end animate-in fade-in slide-in-from-bottom-4 duration-300',
                  )}
                >
                  <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2 overflow-x-hidden">
                  {isEditing &&
                  normalizeUIRole(message.role) === 'user' ? (
                    <>
                      <Textarea
                        value={editText}
                        onChange={(e) => {
                          onEditTextChange(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            onEditSubmit();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            onEditCancel();
                          }
                        }}
                        className="min-h-[60px] resize-none"
                        autoFocus
                      />
                      <div className="mt-1 flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onEditSubmit}
                          className="h-7 w-7"
                          title="Save"
                        >
                          <CheckIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onEditCancel}
                          className="h-7 w-7"
                          title="Cancel"
                        >
                          <XIcon className="size-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {normalizeUIRole(message.role) === 'user' ? (
                        (() => {
                          const { text, context } = parseMessageWithContext(
                            part.text,
                          );

                          // Extract datasources from message metadata or use selectedDatasources for the last user message
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
                                    (ds): ds is DatasourceItem =>
                                      ds !== undefined,
                                  );
                                // Only use metadata datasources if they exist and are valid
                                if (metadataDatasources.length > 0) {
                                  return metadataDatasources;
                                }
                              }
                            }

                            // Priority 2: For the last user message (especially during streaming), use selectedDatasources
                            // This ensures correct datasource is shown immediately, even before metadata is set
                            const lastUserMessage = [...messages]
                              .reverse()
                              .find(
                                (msg) =>
                                  normalizeUIRole(msg.role) === 'user',
                              );

                            const isLastUserMessage =
                              lastUserMessage?.id === message.id;

                            // Use selectedDatasources for the last user message if:
                            // 1. It's the last user message (most recent)
                            // 2. We're streaming or the message was just sent (metadata might not be set yet)
                            // 3. selectedDatasources is available
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
                                  (ds): ds is DatasourceItem =>
                                    ds !== undefined,
                                );
                            }

                            return undefined;
                          })();

                          if (context) {
                            // Use UserMessageBubble for suggestions with context
                            return (
                              <UserMessageBubble
                                key={`${message.id}-${i}`}
                                text={text}
                                context={context}
                                messageId={message.id}
                                messages={messages}
                                datasources={messageDatasources}
                                pluginLogoMap={pluginLogoMap}
                              />
                            );
                          }

                          // Regular user message with datasources
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
                            </div>
                          );
                        })()
                      ) : (
                        // Assistant messages
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
                      {/* Actions below the bubble */}
                      {(isResponseComplete ||
                        (normalizeUIRole(message.role) === 'user' &&
                          isLastTextPart)) && (
                        <div
                          className={cn(
                            'mt-1 flex items-center gap-2',
                            normalizeUIRole(message.role) === 'user' &&
                              'justify-end',
                          )}
                        >
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              const partId = `${message.id}-${i}`;
                              try {
                                await navigator.clipboard.writeText(part.text);
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
                className="w-full max-w-full min-w-0 flex flex-col justify-start gap-2 overflow-x-hidden"
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        const partId = `${message.id}-${i}`;
                        try {
                          await navigator.clipboard.writeText(part.text);
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

              // Show loader while tool is in progress
              if (isToolInProgress) {
                const toolName =
                  'toolName' in toolPart &&
                  typeof toolPart.toolName === 'string'
                    ? getUserFriendlyToolName(`tool-${toolPart.toolName}`)
                    : getUserFriendlyToolName(toolPart.type);
                return (
                  <div
                    key={`${message.id}-${i}`}
                    className="w-full max-w-full min-w-0 flex flex-col justify-start gap-2 overflow-x-hidden"
                  >
                    <Tool
                      defaultOpen={TOOL_UI_CONFIG.DEFAULT_OPEN}
                      variant={variant}
                      className={cn(TOOL_UI_CONFIG.MAX_WIDTH, 'mx-auto')}
                    >
                      <ToolHeader
                        title={toolName}
                        type={toolPart.type}
                        state={toolPart.state}
                        variant={variant}
                      />
                      <ToolContent variant={variant}>
                        {toolPart.input != null ? (
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
                  className="w-full max-w-full min-w-0 flex flex-col justify-start gap-2 overflow-x-hidden"
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

// Memoize MessageItem to prevent unnecessary re-renders
// Only re-render if message content, parts count, or relevant props change
export const MessageItem = memo(MessageItemComponent, (prev, next) => {
  // Re-render if message ID changed (different message)
  if (prev.message.id !== next.message.id) {
    return false;
  }

  // Re-render if message parts count changed
  if (prev.message.parts.length !== next.message.parts.length) {
    return false;
  }

  // Re-render if status changed (affects streaming indicators)
  if (prev.status !== next.status) {
    return false;
  }

  // Re-render if editing state changed
  if (prev.editingMessageId !== next.editingMessageId) {
    return false;
  }

  // Re-render if edit text changed
  if (prev.editText !== next.editText) {
    return false;
  }

  // Re-render if copied part changed
  if (prev.copiedMessagePartId !== next.copiedMessagePartId) {
    return false;
  }

  // Re-render if message is the last message and status is streaming
  const isLastMessage = prev.message.id === prev.messages.at(-1)?.id;
  if (
    isLastMessage &&
    (isChatStreaming(prev.status) || isChatStreaming(next.status))
  ) {
    return false;
  }

  // Re-render if messages array length changed (might indicate new messages)
  // But only if this message is affected
  if (prev.messages.length !== next.messages.length) {
    // Check if this message is still in the array
    const messageStillExists = next.messages.some(
      (m) => m.id === prev.message.id,
    );
    if (!messageStillExists) {
      return false;
    }
    // If it's the last message and array length changed, might be new message added
    if (isLastMessage) {
      return false;
    }
  }

  // Don't re-render if nothing relevant changed
  return true;
});
