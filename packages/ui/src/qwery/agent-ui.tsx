'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '../ai-elements/conversation';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '../ai-elements/message';
import { ReasoningPart } from './ai/message-parts';
import { StreamdownWithSuggestions } from './ai/streamdown-with-suggestions';
import {
  UserMessageBubble,
  parseMessageWithContext,
} from './ai/user-message-bubble';
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
  CheckIcon,
  XIcon,
  ArrowDownIcon,
} from 'lucide-react';
import { Button } from '../shadcn/button';
import { Textarea } from '../shadcn/textarea';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../ai-elements/sources';
import { Tool, ToolHeader, ToolContent, ToolInput } from '../ai-elements/tool';
import { Loader } from '../ai-elements/loader';
import { ChatTransport, UIMessage, ToolUIPart } from 'ai';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { BotAvatar } from './bot-avatar';
import { Sparkles } from 'lucide-react';
import {
  QweryPromptInput,
  type DatasourceItem,
  ToolPart,
  useInfiniteMessages,
  VirtuosoMessageList,
} from './ai';
import { QweryContextProps } from './ai/context';
import { DatasourceBadges } from './ai/datasource-badge';
import { getUserFriendlyToolName } from './ai/utils/tool-name';

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
  // Expose sendMessage function and current model for external use (e.g., notebook sidebar)
  onSendMessageReady?: (
    sendMessage: ReturnType<typeof useChat>['sendMessage'],
    model: string,
  ) => void;
  // Callback when messages change (for detecting tool results)
  onMessagesChange?: (messages: UIMessage[]) => void;
  // Loading state for initial messages/conversation
  isLoading?: boolean;
  // Notebook integration props
  onPasteToNotebook?: (
    sqlQuery: string,
    notebookCellType: 'query' | 'prompt',
    datasourceId: string,
    cellId: number,
  ) => void;
  notebookContext?: {
    cellId?: number;
    notebookCellType?: 'query' | 'prompt';
    datasourceId?: string;
  };
  // Conversation slug for pagination
  conversationSlug?: string;
}

export default function QweryAgentUI(props: QweryAgentUIProps) {
  const {
    initialMessages,
    transport,
    models,
    onOpen,
    usage,
    emitFinish: _emitFinish,
    datasources,
    selectedDatasources,
    onDatasourceSelectionChange,
    pluginLogoMap,
    datasourcesLoading,
    onMessageUpdate,
    onSendMessageReady,
    onMessagesChange,
    isLoading = false,
    onPasteToNotebook,
    notebookContext,
    conversationSlug,
  } = props;

  // Preserve notebook context in a ref so it persists across re-renders and message updates
  // This is critical because messages can be reset during streaming, causing context to be lost
  const notebookContextRef = useRef(notebookContext);
  const [currentNotebookContext, setCurrentNotebookContext] =
    useState(notebookContext);
  useEffect(() => {
    if (notebookContext) {
      notebookContextRef.current = notebookContext;
      // Defer state update to avoid setState in effect
      requestAnimationFrame(() => {
        setCurrentNotebookContext(notebookContext);
      });
    }
  }, [notebookContext]);
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

  const {
    messages: chatMessages,
    sendMessage,
    status,
    regenerate,
    stop,
    setMessages,
  } = useChat({
    messages: initialMessages,
    experimental_throttle: 100,
    transport: transportInstance,
  });

  // Infinite messages hook for pagination (only if conversationSlug is provided)
  const {
    messages: virtualizedMessages,
    firstItemIndex,
    loadOlderMessages,
    isLoadingOlder,
    hasMoreOlder,
    loadError,
    retryLoadOlder,
    mergeMessages,
  } = useInfiniteMessages({
    conversationSlug: conversationSlug || '',
    initialMessages: chatMessages,
  });

  // Sync useChat messages with Virtuoso (optimized to only sync new messages)
  useEffect(() => {
    mergeMessages(chatMessages);
  }, [chatMessages, mergeMessages]);

  // Use virtualized messages if conversationSlug is provided, otherwise use chatMessages
  const messages = conversationSlug ? virtualizedMessages : chatMessages;

  // Notify parent when messages change (for detecting tool results)
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // Expose sendMessage, setMessages, and current model to parent component (for notebook sidebar integration)
  useEffect(() => {
    if (onSendMessageReady) {
      // Create a wrapper that also exposes setMessages for metadata updates
      const wrappedSendMessage = (
        message: Parameters<typeof sendMessage>[0],
        options?: Parameters<typeof sendMessage>[1],
      ) => {
        return sendMessage(message, options);
      };
      (
        wrappedSendMessage as typeof sendMessage & {
          setMessages: typeof setMessages;
        }
      ).setMessages = setMessages;
      onSendMessageReady(
        wrappedSendMessage as typeof sendMessage & {
          setMessages: typeof setMessages;
        },
        state.model,
      );
    }
  }, [sendMessage, setMessages, state.model, onSendMessageReady]);

  const { setIsProcessing } = useAgentStatus();

  useEffect(() => {
    setIsProcessing(status === 'streaming' || status === 'submitted');
  }, [status, setIsProcessing]);

  // Scroll to bottom instantly when loading completes
  useEffect(() => {
    if (previousIsLoadingRef.current && !isLoading && messages.length > 0) {
      // Loading just finished - scroll to bottom instantly without animation
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        // Find the scrollable container within the conversation container
        // The Conversation component renders a StickToBottom which is the scrollable element
        const container = conversationContainerRef.current;
        if (container) {
          // Find the first scrollable child (the StickToBottom element)
          const scrollContainer = container.querySelector(
            '[role="log"]',
          ) as HTMLElement;
          if (
            scrollContainer &&
            scrollContainer.scrollHeight > scrollContainer.clientHeight
          ) {
            // Scroll instantly to bottom by setting scrollTop directly
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      });
    }
    previousIsLoadingRef.current = isLoading;
  }, [isLoading, messages.length]);

  // Update messages when initialMessages changes (e.g., when conversation loads)
  // This is important for notebook chat integration where messages load asynchronously
  // IMPORTANT: Don't update during streaming to avoid flickering
  const previousInitialMessagesRef = useRef<UIMessage[] | undefined>(undefined);
  const isInitialMountRef = useRef(true);
  const isStreamingRef = useRef(false);
  const lastStreamingEndTimeRef = useRef<number>(0);
  const STREAMING_COOLDOWN_MS = 5000; // Don't update messages for 5s after streaming ends

  // Track streaming state in a ref to avoid dependency issues
  useEffect(() => {
    const wasStreaming = isStreamingRef.current;
    isStreamingRef.current = status === 'streaming' || status === 'submitted';

    // Track when streaming ends
    if (wasStreaming && !isStreamingRef.current) {
      lastStreamingEndTimeRef.current = Date.now();
    }
  }, [status]);

  useEffect(() => {
    // Never update during streaming
    if (isStreamingRef.current) {
      return;
    }

    // Don't update for a cooldown period after streaming ends (prevents flicker from refetches)
    const timeSinceStreamingEnd = Date.now() - lastStreamingEndTimeRef.current;
    if (
      timeSinceStreamingEnd < STREAMING_COOLDOWN_MS &&
      timeSinceStreamingEnd > 0
    ) {
      return;
    }

    // Only update if initialMessages actually changed (reference equality check)
    if (initialMessages !== previousInitialMessagesRef.current) {
      previousInitialMessagesRef.current = initialMessages;

      if (initialMessages && initialMessages.length > 0) {
        // On initial mount, always set messages (even if messages already exist from cache/previous render)
        // This ensures old conversations load correctly
        if (isInitialMountRef.current) {
          isInitialMountRef.current = false;
          setMessages(initialMessages);
          return;
        }

        // Check if messages are actually different
        const currentMessageIds = new Set(messages.map((m) => m.id));
        const initialMessageIds = new Set(initialMessages.map((m) => m.id));
        const idsMatch =
          currentMessageIds.size === initialMessageIds.size &&
          Array.from(currentMessageIds).every((id) =>
            initialMessageIds.has(id),
          );

        // Only update if IDs don't match
        if (!idsMatch) {
          // Check if current messages have tool outputs or are more complete
          const currentHasToolOutputs = messages.some(
            (msg) =>
              msg.role === 'assistant' &&
              msg.parts?.some((part) => part.type?.startsWith('tool-')),
          );

          // Check if current messages have more parts than initialMessages (more complete)
          const currentMoreComplete = messages.some((msg) => {
            const initialMsg = initialMessages.find((im) => im.id === msg.id);
            if (!initialMsg) return false;
            // Current message is more complete if it has more parts
            return (msg.parts?.length || 0) > (initialMsg.parts?.length || 0);
          });

          if (currentHasToolOutputs || currentMoreComplete) {
            // Don't replace messages that are more complete - they might have tool outputs or streaming content
            // that hasn't been persisted to initialMessages yet
            return;
          } else {
            // Only update if initialMessages has new messages or is more complete
            setMessages(initialMessages);
          }
        } else {
          // IDs match, but check if initialMessages has more complete content
          // Only update if initialMessages is significantly more complete (has tool outputs we don't have)
          const initialHasToolOutputs = initialMessages.some(
            (msg) =>
              msg.role === 'assistant' &&
              msg.parts?.some((part) => part.type?.startsWith('tool-')),
          );
          const currentHasToolOutputs = messages.some(
            (msg) =>
              msg.role === 'assistant' &&
              msg.parts?.some((part) => part.type?.startsWith('tool-')),
          );

          // Only update if initialMessages has tool outputs that current messages don't have
          if (initialHasToolOutputs && !currentHasToolOutputs) {
            setMessages(initialMessages);
          }
          // Otherwise, keep current messages (they might be more up-to-date from streaming)
        }
      } else if (
        initialMessages &&
        initialMessages.length === 0 &&
        messages.length > 0
      ) {
        // If initialMessages is empty array, clear messages (conversation was cleared)
        // But only if not streaming and cooldown has passed
        if (
          !isStreamingRef.current &&
          timeSinceStreamingEnd >= STREAMING_COOLDOWN_MS
        ) {
          setMessages([]);
        }
      } else if (!initialMessages && messages.length === 0) {
        // If initialMessages is undefined and we have no messages, that's fine
        // Don't update
      }

      isInitialMountRef.current = false;
    }
  }, [initialMessages, setMessages, messages]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  const viewSheetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [copiedMessagePartId, setCopiedMessagePartId] = useState<string | null>(
    null,
  );
  const previousIsLoadingRef = useRef(isLoading);

  // Handle edit message
  const _handleEditStart = useCallback((messageId: string, text: string) => {
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
    // Remove the last assistant message before regenerating
    const lastAssistantMessage = messages
      .filter((m) => m.role === 'assistant')
      .at(-1);

    if (lastAssistantMessage) {
      // Remove the old assistant message
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== lastAssistantMessage.id),
      );
    }

    // Small delay to ensure state update, then regenerate
    setTimeout(() => {
      regenerate();
    }, 0);
  }, [messages, regenerate, setMessages]);

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
  // Check if last assistant message has any text parts
  const lastAssistantHasText = useMemo(() => {
    if (!lastAssistantMessage) return false;
    // Check for text parts or any parts (streaming might start with empty parts)
    return lastAssistantMessage.parts.some(
      (p) => p.type === 'text' || p.type === 'reasoning',
    );
  }, [lastAssistantMessage]);
  // Check if the last assistant message is actually the last message (to ensure it's rendered)
  const lastMessageIsAssistant = useMemo(() => {
    return (
      messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'
    );
  }, [messages]);

  const prevViewSheetCountRef = useRef(0);

  // Auto-scroll to the latest view sheet when it's rendered
  useEffect(() => {
    const viewSheetEntries = Array.from(viewSheetRefs.current.entries());
    const currentCount = viewSheetEntries.length;

    if (
      currentCount > prevViewSheetCountRef.current &&
      viewSheetEntries.length > 0
    ) {
      const lastEntry = viewSheetEntries[viewSheetEntries.length - 1];
      if (lastEntry && lastEntry[1]) {
        const lastViewSheetElement = lastEntry[1];
        setTimeout(() => {
          lastViewSheetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 300);
      }
    }

    prevViewSheetCountRef.current = currentCount;
  }, [messages, status]);

  return (
    <PromptInputProvider initialInput={state.input}>
      <div
        ref={containerRef}
        className="relative mx-auto flex h-full w-full max-w-4xl min-w-0 flex-col overflow-x-hidden p-6"
      >
        <div
          ref={conversationContainerRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overflow-x-hidden"
        >
          {conversationSlug ? (
            // Use Virtuoso for infinite scrolling - it manages its own scroll container
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overflow-x-hidden">
              {isLoading ? (
                <div className="flex size-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <BotAvatar size={12} isLoading={true} />
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">
                      Loading conversation...
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Please wait while we load your messages
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <ConversationEmptyState
                  title="Start a conversation"
                  description="Ask me anything and I'll help you out. You can ask questions or get explanations."
                  icon={<Sparkles className="text-muted-foreground size-12" />}
                />
              ) : (
                <>
                  <VirtuosoMessageList
                    messages={messages}
                    firstItemIndex={firstItemIndex}
                    status={status}
                    isLoadingOlder={isLoadingOlder}
                    hasMoreOlder={hasMoreOlder}
                    loadError={loadError}
                    onLoadOlder={loadOlderMessages}
                    onRetryLoadOlder={retryLoadOlder}
                    conversationSlug={conversationSlug}
                    scrollToBottomRef={scrollToBottomRef}
                    lastAssistantHasText={lastAssistantHasText}
                    lastMessageIsAssistant={lastMessageIsAssistant}
                    lastAssistantMessage={lastAssistantMessage}
                    editingMessageId={editingMessageId}
                    editText={editText}
                    copiedMessagePartId={copiedMessagePartId}
                    datasources={datasources}
                    selectedDatasources={selectedDatasources}
                    pluginLogoMap={pluginLogoMap}
                    notebookContext={currentNotebookContext}
                    onEditSubmit={handleEditSubmit}
                    onEditCancel={handleEditCancel}
                    onEditTextChange={setEditText}
                    onRegenerate={handleRegenerate}
                    onCopyPart={setCopiedMessagePartId}
                    sendMessage={sendMessage}
                    onPasteToNotebook={onPasteToNotebook}
                    renderScrollButton={(scrollToBottom, isAtBottom) =>
                      !isAtBottom ? (
                        <Button
                          className="absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full"
                          onClick={scrollToBottom}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <ArrowDownIcon className="size-4" />
                        </Button>
                      ) : null
                    }
                  />
                  {/* ScrollToBottomRefSetter not needed for Virtuoso - scrollToBottomRef is set directly by VirtuosoMessageList */}
                </>
              )}
            </div>
          ) : (
            // Fallback to old rendering when conversationSlug is not provided
            <Conversation className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
              <ConversationContent className="max-w-full min-w-0 overflow-x-hidden">
                {isLoading ? (
                  <div className="flex size-full flex-col items-center justify-center gap-4 p-8 text-center">
                    <BotAvatar size={12} isLoading={true} />
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">
                        Loading conversation...
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Please wait while we load your messages
                      </p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <ConversationEmptyState
                    title="Start a conversation"
                    description="Ask me anything and I'll help you out. You can ask questions or get explanations."
                    icon={
                      <Sparkles className="text-muted-foreground size-12" />
                    }
                  />
                ) : (
                  // Fallback to old rendering when conversationSlug is not provided
                  messages.map((message) => {
                    const sourceParts = message.parts.filter(
                      (part: { type: string }) => part.type === 'source-url',
                    );

                    const textParts = message.parts.filter(
                      (p) => p.type === 'text',
                    );
                    const isLastAssistantMessage =
                      message.id === lastAssistantMessage?.id;

                    const lastTextPartIndex =
                      textParts.length > 0
                        ? message.parts.findLastIndex((p) => p.type === 'text')
                        : -1;

                    return (
                      <div
                        key={message.id}
                        className="max-w-full min-w-0 overflow-x-hidden"
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
                                    'flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden',
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
                                  <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2 overflow-x-hidden">
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
                                        {message.role === 'user' ? (
                                          // User messages - check if it's a suggestion with context
                                          (() => {
                                            const { text, context } =
                                              parseMessageWithContext(
                                                part.text,
                                              );

                                            // Extract datasources from message metadata or use selectedDatasources for the last user message
                                            const messageDatasources = (() => {
                                              // Priority 1: Check message metadata first (for notebook cell messages and persisted messages)
                                              // This ensures notebook cell datasource is always used
                                              if (
                                                message.metadata &&
                                                typeof message.metadata ===
                                                  'object'
                                              ) {
                                                const metadata =
                                                  message.metadata as Record<
                                                    string,
                                                    unknown
                                                  >;
                                                if (
                                                  'datasources' in metadata &&
                                                  Array.isArray(
                                                    metadata.datasources,
                                                  )
                                                ) {
                                                  const metadataDatasources = (
                                                    metadata.datasources as string[]
                                                  )
                                                    .map((dsId) =>
                                                      datasources?.find(
                                                        (ds) => ds.id === dsId,
                                                      ),
                                                    )
                                                    .filter(
                                                      (
                                                        ds,
                                                      ): ds is DatasourceItem =>
                                                        ds !== undefined,
                                                    );
                                                  // Only use metadata datasources if they exist and are valid
                                                  if (
                                                    metadataDatasources.length >
                                                    0
                                                  ) {
                                                    return metadataDatasources;
                                                  }
                                                }
                                              }

                                              // Priority 2: For the last user message (especially during streaming), use selectedDatasources
                                              // This ensures correct datasource is shown immediately, even before metadata is set
                                              const lastUserMessage = [
                                                ...messages,
                                              ]
                                                .reverse()
                                                .find(
                                                  (msg) => msg.role === 'user',
                                                );

                                              const isLastUserMessage =
                                                lastUserMessage?.id ===
                                                message.id;

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
                                                    datasources?.find(
                                                      (ds) => ds.id === dsId,
                                                    ),
                                                  )
                                                  .filter(
                                                    (
                                                      ds,
                                                    ): ds is DatasourceItem =>
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
                                                  datasources={
                                                    messageDatasources
                                                  }
                                                  pluginLogoMap={pluginLogoMap}
                                                />
                                              );
                                            }

                                            // Regular user message with datasources
                                            return (
                                              <div className="flex flex-col items-end gap-1.5">
                                                {messageDatasources &&
                                                  messageDatasources.length >
                                                    0 && (
                                                    <div className="flex w-full max-w-[80%] min-w-0 justify-end overflow-x-hidden">
                                                      <DatasourceBadges
                                                        datasources={
                                                          messageDatasources
                                                        }
                                                        pluginLogoMap={
                                                          pluginLogoMap
                                                        }
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
                                                      currentMessageId={
                                                        message.id
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
                                                      currentMessageId={
                                                        message.id
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
                                                  setCopiedMessagePartId(
                                                    partId,
                                                  );
                                                  setTimeout(() => {
                                                    setCopiedMessagePartId(
                                                      null,
                                                    );
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
                                  {message.role === 'user' && (
                                    <div className="mt-1 size-6 shrink-0" />
                                  )}
                                </div>
                              );
                            }
                            case 'reasoning':
                              return (
                                <ReasoningPart
                                  key={`${message.id}-${i}`}
                                  part={
                                    part as { type: 'reasoning'; text: string }
                                  }
                                  messageId={message.id}
                                  index={i}
                                  isStreaming={
                                    status === 'streaming' &&
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
                                      ? getUserFriendlyToolName(
                                          `tool-${toolPart.toolName}`,
                                        )
                                      : getUserFriendlyToolName(toolPart.type);
                                  return (
                                    <Tool
                                      key={`${message.id}-${i}`}
                                      defaultOpen={false}
                                    >
                                      <ToolHeader
                                        title={toolName}
                                        type={toolPart.type}
                                        state={toolPart.state}
                                      />
                                      <ToolContent>
                                        {toolPart.input != null ? (
                                          <ToolInput input={toolPart.input} />
                                        ) : null}
                                        <div className="flex items-center justify-center py-8">
                                          <Loader size={20} />
                                        </div>
                                      </ToolContent>
                                    </Tool>
                                  );
                                }

                                // Use ToolPart component for completed tools (includes visualizers)
                                // Use ref to ensure notebook context persists even if prop changes during re-render
                                // This prevents paste button from disappearing when messages reset
                                return (
                                  <ToolPart
                                    key={`${message.id}-${i}`}
                                    part={toolPart}
                                    messageId={message.id}
                                    index={i}
                                    onPasteToNotebook={onPasteToNotebook}
                                    notebookContext={currentNotebookContext}
                                  />
                                );
                              }
                              return null;
                          }
                        })}
                      </div>
                    );
                  })
                )}
                {(status === 'submitted' ||
                  (status === 'streaming' &&
                    (!lastAssistantHasText || !lastMessageIsAssistant))) && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden duration-300">
                    <BotAvatar
                      size={6}
                      isLoading={true}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2 overflow-x-hidden">
                      <Message
                        from="assistant"
                        className="w-full max-w-full min-w-0"
                      >
                        <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                          <div className="overflow-wrap-anywhere inline-flex min-w-0 items-baseline gap-0.5 break-words">
                            <MessageResponse></MessageResponse>
                          </div>
                        </MessageContent>
                      </Message>
                    </div>
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton />
              <ScrollToBottomRefSetter scrollRef={scrollToBottomRef} />
            </Conversation>
          )}
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
            scrollToBottomRef={scrollToBottomRef}
          />
        </div>
      </div>
    </PromptInputProvider>
  );
}

function ScrollToBottomRefSetter({
  scrollRef,
}: {
  scrollRef: React.RefObject<(() => void) | null>;
}) {
  // Only use StickToBottom context if it's available (when using old Conversation component)
  // When using Virtuoso, the scrollToBottomRef is set directly by VirtuosoMessageList
  let scrollToBottom: (() => void) | null = null;
  try {
    const context = useStickToBottomContext();
    scrollToBottom = context.scrollToBottom;
  } catch {
    // Context not available (using Virtuoso) - scrollRef will be set by VirtuosoMessageList
    scrollToBottom = null;
  }

  // Always call hooks - conditionally use the value
  useEffect(() => {
    if (scrollToBottom) {
      scrollRef.current = scrollToBottom;
      return () => {
        scrollRef.current = null;
      };
    }
  }, [scrollRef, scrollToBottom]);

  return null;
}

function PromptInputInner({
  sendMessage,
  state,
  setState,
  textareaRef,
  status,
  stop,
  setMessages: _setMessages,
  messages: _messages,
  models,
  usage,
  datasources,
  selectedDatasources,
  onDatasourceSelectionChange,
  pluginLogoMap,
  datasourcesLoading,
  scrollToBottomRef,
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
  scrollToBottomRef: React.RefObject<(() => void) | null>;
}) {
  const attachments = usePromptInputAttachments();
  const controller = usePromptInputController();
  const previousMessagesLengthRef = useRef(_messages.length);

  // Scroll to bottom when a new user message is added
  useEffect(() => {
    const currentLength = _messages.length;
    const previousLength = previousMessagesLengthRef.current;

    if (currentLength > previousLength) {
      const lastMessage = _messages[_messages.length - 1];
      // Only scroll if the new message is from the user
      if (lastMessage && lastMessage.role === 'user') {
        // Use multiple timeouts to ensure DOM is updated
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottomRef.current?.();
          }, 0);
          setTimeout(() => {
            scrollToBottomRef.current?.();
          }, 100);
          setTimeout(() => {
            scrollToBottomRef.current?.();
          }, 300);
        });
      }
    }

    previousMessagesLengthRef.current = currentLength;
  }, [_messages, scrollToBottomRef]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (status === 'streaming' || status === 'submitted') {
      return;
    }

    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // Clear input immediately on submit (button click or Enter press)
    controller.textInput.clear();
    setState((prev) => ({ ...prev, input: '' }));

    // Scroll immediately when submitting
    requestAnimationFrame(() => {
      scrollToBottomRef.current?.();
    });

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
            datasources:
              selectedDatasources && selectedDatasources.length > 0
                ? selectedDatasources
                : undefined,
          },
        },
      );
      attachments.clear();
      // Scroll again after message is sent to ensure we're at bottom
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottomRef.current?.();
        }, 0);
        setTimeout(() => {
          scrollToBottomRef.current?.();
        }, 100);
        setTimeout(() => {
          scrollToBottomRef.current?.();
        }, 300);
      });
      // Don't clear input here - it's already cleared on submit
      // The input should only be cleared on explicit user action (submit button or Enter)
    } catch {
      toast.error('Failed to send message. Please try again.');
      // On error, restore the input so user can retry
      if (message.text) {
        setState((prev) => ({ ...prev, input: message.text }));
      }
    }
  };

  const handleStop = async () => {
    // Don't remove the message - keep whatever was generated so far
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
      status={status}
      textareaRef={textareaRef}
      onStop={handleStop}
      stopDisabled={false}
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
