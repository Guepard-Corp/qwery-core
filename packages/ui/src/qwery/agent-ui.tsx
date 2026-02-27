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
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import {
  ReasoningPart,
  getExecutionTimeMsFromMessageParts,
} from './ai/message-parts';
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
import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import { useChat, type UIMessage as AiSdkUIMessage } from '@ai-sdk/react';
import { useAgentStatus } from './ai/agent-status-context';
import { useCompletionSound } from './ai/utils/notification-sound';
import {
  CopyIcon,
  RefreshCcwIcon,
  CheckIcon,
  XIcon,
  ArrowDownIcon,
  PencilIcon,
} from 'lucide-react';
import { Button } from '../shadcn/button';
import { Textarea } from '../shadcn/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../shadcn/alert-dialog';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../ai-elements/sources';
import { ChatTransport, UIMessage, ToolUIPart } from 'ai';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { BotAvatar } from './bot-avatar';
import { Sparkles } from 'lucide-react';
import {
  QweryPromptInput,
  type DatasourceItem,
  ToolPart,
  TodoPart,
  useInfiniteMessages,
  VirtuosoMessageList,
} from './ai';
import { QweryContextProps } from './ai/context';
import { DatasourceBadges } from './ai/datasource-badge';
import { DatasourceSelector } from './ai/datasource-selector';
import { getLastTodoPartIndex } from './ai/utils/todo-parts';
import { ToolVariantProvider } from './ai/tool-variant-context';
import type { NotebookCellType } from './ai/utils/notebook-cell-type';
import type { FeedbackPayload } from './ai/feedback-types';
import {
  SuggestionBadges,
  SuggestionBadgesSkeleton,
} from './ai/suggestion-badges';
import {
  extractAllSuggestionMatches,
  type SuggestionMetadata,
} from './ai/utils/suggestion-pattern';
import {
  getTextContentFromMessage,
  getContextMessages,
} from './ai/utils/message-context';
import { isChatActive, isChatIdle } from './ai/utils/chat-status';

export interface QweryAgentUIProps {
  initialMessages?: UIMessage[];
  transport: (model: string) => ChatTransport<UIMessage>;
  models: { name: string; value: string }[];
  onOpen?: () => void;
  usage?: QweryContextProps;
  emitFinish?: () => void;
  datasources?: DatasourceItem[];
  selectedDatasources?: string[];
  onDatasourceSelectionChange?: (datasourceIds: string[]) => void;
  getDatasourcesForSend?: () => string[];
  pluginLogoMap?: Map<string, string>;
  datasourcesLoading?: boolean;
  onMessageUpdate?: (
    messageId: string,
    content: string,
    datasourceIds?: string[],
  ) => Promise<void>;
  onSendMessageReady?: (
    sendMessage: ReturnType<typeof useChat>['sendMessage'],
    model: string,
  ) => void;
  onMessagesChange?: (messages: UIMessage[]) => void;
  onDatasourceNameClick?: (id: string, name: string) => void;
  getDatasourceTooltip?: (id: string) => string;
  isLoading?: boolean;
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
  conversationSlug?: string;
  onSubmitFeedback?: (
    messageId: string,
    feedback: FeedbackPayload,
  ) => Promise<void>;
  initialSuggestions?: string[];
  onBeforeSuggestionSend?: (
    text: string,
    metadata?: import('./ai/utils/suggestion-pattern').SuggestionMetadata,
  ) => Promise<boolean>;
}

type UseChatTransport = NonNullable<
  Extract<
    NonNullable<Parameters<typeof useChat>[0]>,
    { transport?: unknown }
  >['transport']
>;

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

function QweryAgentUIContent(props: QweryAgentUIProps) {
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
    getDatasourcesForSend,
    pluginLogoMap,
    datasourcesLoading,
    onMessageUpdate,
    onSendMessageReady,
    onMessagesChange,
    isLoading = false,
    onPasteToNotebook,
    notebookContext,
    conversationSlug,
    onSubmitFeedback,
    initialSuggestions,
    onBeforeSuggestionSend,
    onDatasourceNameClick,
    getDatasourceTooltip,
  } = props;

  const notebookContextRef = useRef(notebookContext);
  const [currentNotebookContext, setCurrentNotebookContext] =
    useState(notebookContext);
  useEffect(() => {
    if (notebookContext) {
      notebookContextRef.current = notebookContext;
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

  const [showSuggestionBadges, setShowSuggestionBadges] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const v = localStorage.getItem('qwery-show-suggestion-badges');
      return v !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        'qwery-show-suggestion-badges',
        String(showSuggestionBadges),
      );
    } catch {
      /* ignore */
    }
  }, [showSuggestionBadges]);

  const transportInstance = useMemo(
    () => transport(state.model),
    [transport, state.model],
  );

  const {
    messages: chatMessagesAiSdk,
    sendMessage,
    status,
    regenerate,
    stop,
    setMessages,
    addToolApprovalResponse,
  } = useChat<AiSdkUIMessage>({
    messages: initialMessages as unknown as AiSdkUIMessage[] | undefined,
    experimental_throttle: 100,
    transport: transportInstance as unknown as UseChatTransport,
  });

  const chatMessages = chatMessagesAiSdk as unknown as UIMessage[];

  // Play notification sound when agent response completes
  useCompletionSound(status);

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

  useEffect(() => {
    mergeMessages(chatMessages);
  }, [chatMessages, mergeMessages]);

  const messages = conversationSlug ? virtualizedMessages : chatMessages;

  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  useEffect(() => {
    if (onSendMessageReady) {
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
    const isCurrentlyProcessing =
      status === 'streaming' || status === 'submitted';
    if (conversationSlug) {
      setIsProcessing(isCurrentlyProcessing, conversationSlug);
    } else if (!isCurrentlyProcessing) {
      setIsProcessing(false);
    }
  }, [status, setIsProcessing, conversationSlug]);

  useEffect(() => {
    if (status === 'ready') {
      emitFinish?.();
    }
  }, [status, emitFinish]);

  useEffect(() => {
    previousIsLoadingRef.current = isLoading;
  }, [isLoading]);

  const previousInitialMessagesRef = useRef<UIMessage[] | undefined>(undefined);
  const previousConversationSlugRef = useRef<string | undefined>(
    conversationSlug,
  );
  const isInitialMountRef = useRef(true);
  const isStreamingRef = useRef(false);
  const lastStreamingEndTimeRef = useRef<number>(0);
  const STREAMING_COOLDOWN_MS = 5000;
  useEffect(() => {
    const wasStreaming = isStreamingRef.current;
    isStreamingRef.current = status === 'streaming' || status === 'submitted';

    if (wasStreaming && !isStreamingRef.current) {
      lastStreamingEndTimeRef.current = Date.now();
    }
  }, [status]);

  useEffect(() => {
    if (isStreamingRef.current) {
      return;
    }

    const hasConversationChanged =
      previousConversationSlugRef.current !== conversationSlug;
    if (hasConversationChanged) {
      previousConversationSlugRef.current = conversationSlug;
      previousInitialMessagesRef.current = initialMessages;
      isInitialMountRef.current = false;
      setMessages(initialMessages ?? []);
      return;
    }

    const timeSinceStreamingEnd = Date.now() - lastStreamingEndTimeRef.current;
    if (
      timeSinceStreamingEnd < STREAMING_COOLDOWN_MS &&
      timeSinceStreamingEnd > 0
    ) {
      return;
    }

    if (initialMessages !== previousInitialMessagesRef.current) {
      previousInitialMessagesRef.current = initialMessages;

      if (initialMessages && initialMessages.length > 0) {
        if (isInitialMountRef.current) {
          isInitialMountRef.current = false;
          setMessages(initialMessages);
          return;
        }

        const currentMessageIds = new Set(messages.map((m) => m.id));
        const initialMessageIds = new Set(initialMessages.map((m) => m.id));
        const idsMatch =
          currentMessageIds.size === initialMessageIds.size &&
          Array.from(currentMessageIds).every((id) =>
            initialMessageIds.has(id),
          );

        if (!idsMatch) {
          const hasLocalUnsyncedMessages =
            messages.length > initialMessages.length;
          const currentHasToolOutputs = messages.some(
            (msg) =>
              msg.role === 'assistant' &&
              msg.parts?.some((part) => part.type?.startsWith('tool-')),
          );

          const currentMoreComplete = messages.some((msg) => {
            const initialMsg = initialMessages.find((im) => im.id === msg.id);
            if (!initialMsg) return false;
            return (msg.parts?.length || 0) > (initialMsg.parts?.length || 0);
          });

          if (
            hasLocalUnsyncedMessages ||
            currentHasToolOutputs ||
            currentMoreComplete
          ) {
            return;
          } else {
            setMessages(initialMessages);
          }
        } else {
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

          if (initialHasToolOutputs && !currentHasToolOutputs) {
            setMessages(initialMessages);
          }
        }
      }

      isInitialMountRef.current = false;
    }
  }, [conversationSlug, initialMessages, setMessages, messages]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const viewSheetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editDatasources, setEditDatasources] = useState<string[]>([]);
  const [copiedMessagePartId, setCopiedMessagePartId] = useState<string | null>(
    null,
  );
  const [editWarningDialog, setEditWarningDialog] = useState<{
    open: boolean;
    messageId: string;
    messageText: string;
  }>({ open: false, messageId: '', messageText: '' });
  const [badgesVisibleAfterDelay, setBadgesVisibleAfterDelay] = useState(false);
  const [badgesLoadDelayPassed, setBadgesLoadDelayPassed] = useState(false);
  const [badgesFadingOut, setBadgesFadingOut] = useState(false);
  const [badgesFadeToZero, setBadgesFadeToZero] = useState(false);
  const [badgesRevealing, setBadgesRevealing] = useState(false);
  const prevShowBadgesRef = useRef(false);
  const [, setIsScrollAtBottom] = useState(true);
  const previousIsLoadingRef = useRef(isLoading);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isSentinelInView, setIsSentinelInView] = useState(false);

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    const id = setTimeout(() => setIsSentinelInView(false), 0);
    const observerRef = { current: null as IntersectionObserver | null };
    const rafId = requestAnimationFrame(() => {
      const sentinel = sentinelRef.current;
      const root =
        scrollContainerRef.current ?? conversationContainerRef.current;
      if (!sentinel || !root) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            setIsSentinelInView(entry.isIntersecting);
          }
        },
        {
          root,
          threshold: 0,
          rootMargin: '0px 0px -100px 0px',
        },
      );
      observerRef.current = observer;
      observer.observe(sentinel);
    });

    return () => {
      clearTimeout(id);
      cancelAnimationFrame(rafId);
      observerRef.current?.disconnect();
    };
  }, [messages.length]);

  useEffect(() => {
    if (isLoading || messages.length > 0 || !initialSuggestions?.length) {
      const id = setTimeout(() => setBadgesVisibleAfterDelay(false), 0);
      return () => clearTimeout(id);
    }
    const t = setTimeout(() => setBadgesVisibleAfterDelay(true), 500);
    return () => clearTimeout(t);
  }, [isLoading, messages.length, initialSuggestions?.length]);

  useEffect(() => {
    if (isLoading || messages.length === 0) {
      const id = setTimeout(() => setBadgesLoadDelayPassed(false), 0);
      return () => clearTimeout(id);
    }
    const t = setTimeout(() => setBadgesLoadDelayPassed(true), 500);
    return () => clearTimeout(t);
  }, [isLoading, messages.length]);

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
    setEditText('');
    setEditDatasources([]);
  }, []);

  const handleEditStart = useCallback(
    (messageId: string, text: string, datasourceIds: string[]) => {
      setEditingMessageId(messageId);
      setEditText(text);
      setEditDatasources(datasourceIds);
    },
    [],
  );

  const handleEditConfirmWithWarning = useCallback(() => {
    if (!editingMessageId || !editText.trim()) return;

    const updatedText = editText.trim();
    const messageIndex = messages.findIndex((m) => m.id === editingMessageId);

    setMessages((prev) => {
      let updatedMessages = prev.slice(0, messageIndex + 1);
      updatedMessages = updatedMessages.map((msg) => {
        if (msg.id === editingMessageId) {
          return {
            ...msg,
            parts: msg.parts.map((p) =>
              p.type === 'text' ? { ...p, text: updatedText } : p,
            ),
            metadata: {
              ...(msg.metadata || {}),
              datasources:
                editDatasources.length > 0 ? editDatasources : undefined,
            },
          };
        }
        return msg;
      });
      return updatedMessages;
    });

    setEditingMessageId(null);
    setEditText('');
    setEditDatasources([]);
    setEditWarningDialog({ open: false, messageId: '', messageText: '' });

    if (onMessageUpdate) {
      onMessageUpdate(
        editingMessageId,
        updatedText,
        editDatasources.length > 0 ? editDatasources : undefined,
      ).catch((error) => {
        console.error('Failed to persist message edit:', error);
      });
    }

    regenerate();
    scrollToBottomRef.current?.();
  }, [
    editingMessageId,
    editText,
    editDatasources,
    messages,
    setMessages,
    onMessageUpdate,
    regenerate,
    scrollToBottomRef,
  ]);

  const handleEditSubmit = useCallback(async () => {
    if (!editingMessageId || !editText.trim()) return;

    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages.at(-1);
    const isLastUserMessage = lastUserMessage?.id === editingMessageId;

    if (!isLastUserMessage) {
      setEditWarningDialog({
        open: true,
        messageId: editingMessageId,
        messageText: editText.trim(),
      });
      return;
    }

    const updatedText = editText.trim();

    const lastAssistantMessage = messages
      .filter((m) => m.role === 'assistant')
      .at(-1);

    setMessages((prev) => {
      let updatedMessages = prev.map((msg) => {
        if (msg.id === editingMessageId) {
          return {
            ...msg,
            parts: msg.parts.map((p) =>
              p.type === 'text' ? { ...p, text: updatedText } : p,
            ),
            metadata: {
              ...(msg.metadata || {}),
              datasources:
                editDatasources.length > 0 ? editDatasources : undefined,
            },
          };
        }
        return msg;
      });

      if (lastAssistantMessage) {
        updatedMessages = updatedMessages.filter(
          (msg) => msg.id !== lastAssistantMessage.id,
        );
      }

      return updatedMessages;
    });

    setEditingMessageId(null);
    setEditText('');
    setEditDatasources([]);

    if (onMessageUpdate) {
      try {
        await onMessageUpdate(
          editingMessageId,
          updatedText,
          editDatasources.length > 0 ? editDatasources : undefined,
        );
      } catch (error) {
        console.error('Failed to persist message edit:', error);
      }
    }

    regenerate();
    scrollToBottomRef.current?.();
  }, [
    editingMessageId,
    editText,
    editDatasources,
    setMessages,
    onMessageUpdate,
    messages,
    regenerate,
    scrollToBottomRef,
  ]);

  const handleRegenerate = useCallback(async () => {
    const lastAssistantMessage = messages
      .filter((m) => m.role === 'assistant')
      .at(-1);

    if (lastAssistantMessage) {
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== lastAssistantMessage.id),
      );
    }

    const lastUserMessage = messages.filter((m) => m.role === 'user').at(-1);

    if (lastUserMessage) {
      const messageMetadata = (lastUserMessage.metadata || {}) as Record<
        string,
        unknown
      >;
      const metadataDatasources = messageMetadata.datasources as
        | string[]
        | undefined;

      const datasourcesToUse =
        metadataDatasources && metadataDatasources.length > 0
          ? metadataDatasources
          : selectedDatasources;
      if (datasourcesToUse && datasourcesToUse.length > 0) {
        setMessages((prev) => {
          const lastUserIndex = prev.findLastIndex(
            (msg) => msg.role === 'user',
          );
          if (lastUserIndex >= 0) {
            const lastUserMsg = prev[lastUserIndex];
            if (lastUserMsg) {
              const updated = [...prev];
              updated[lastUserIndex] = {
                ...lastUserMsg,
                metadata: {
                  ...(lastUserMsg.metadata || {}),
                  datasources: datasourcesToUse,
                },
              };
              return updated;
            }
          }
          return prev;
        });
      }
    }

    regenerate();
    scrollToBottomRef.current?.();
  }, [
    messages,
    regenerate,
    setMessages,
    scrollToBottomRef,
    selectedDatasources,
  ]);

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
  const lastAssistantHasText = useMemo(() => {
    if (!lastAssistantMessage) return false;
    return lastAssistantMessage.parts.some(
      (p) => p.type === 'text' || p.type === 'reasoning',
    );
  }, [lastAssistantMessage]);
  const lastMessageIsAssistant = useMemo(() => {
    return (
      messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'
    );
  }, [messages]);

  const badgeSuggestions = useMemo(() => {
    type Item = { text: string; metadata?: SuggestionMetadata };
    let list: Item[] = [];
    if (messages.length === 0 && initialSuggestions?.length) {
      list = initialSuggestions.map((text) => ({ text }));
    } else if (lastAssistantMessage) {
      const text = getTextContentFromMessage(lastAssistantMessage);
      const matches = extractAllSuggestionMatches(text);
      if (matches.length > 0) {
        list = matches.map((m) => ({
          text: m.text,
          metadata: m.metadata,
        }));
      }
    }
    return list.slice(0, 3);
  }, [messages.length, initialSuggestions, lastAssistantMessage]);

  const lastMessageHasSuggestions =
    messages.length > 0 && badgeSuggestions.length > 0;

  const handleBadgeSuggestionClick = useCallback(
    async (cleanSuggestionText: string, metadata?: SuggestionMetadata) => {
      console.log('[agent-ui] handleBadgeSuggestionClick', {
        text: cleanSuggestionText,
        metadataJson: JSON.stringify(metadata ?? {}),
        metadata,
      });
      const ok =
        onBeforeSuggestionSend === undefined
          ? true
          : await onBeforeSuggestionSend(cleanSuggestionText, metadata);
      if (!ok) return;
      let messageText = cleanSuggestionText;
      const { lastAssistantResponse, parentConversationId } =
        getContextMessages(messages, lastAssistantMessage?.id);
      if (lastAssistantResponse || parentConversationId) {
        const contextData = JSON.stringify({
          lastAssistantResponse,
          parentConversationId,
        });
        messageText = `__QWERY_CONTEXT__${contextData}__QWERY_CONTEXT_END__${cleanSuggestionText}`;
      }
      sendMessage({ text: messageText }, {});
      scrollToBottomRef.current?.();
    },
    [
      messages,
      lastAssistantMessage?.id,
      sendMessage,
      scrollToBottomRef,
      onBeforeSuggestionSend,
    ],
  );

  const showBadges =
    !isLoading &&
    isChatIdle(status) &&
    badgeSuggestions.length > 0 &&
    (messages.length === 0
      ? badgesVisibleAfterDelay
      : isSentinelInView && badgesLoadDelayPassed);

  const showBadgeSlotVisible =
    showBadges ||
    (messages.length === 0 &&
      ((isLoading && initialSuggestions?.length) ||
        (badgeSuggestions.length > 0 &&
          initialSuggestions?.length &&
          !badgesVisibleAfterDelay)));

  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    if (
      prevShowBadgesRef.current &&
      !showBadges &&
      badgeSuggestions.length > 0
    ) {
      ids.push(
        setTimeout(() => {
          setBadgesFadingOut(true);
          setBadgesFadeToZero(false);
        }, 0),
      );
    }
    if (
      !prevShowBadgesRef.current &&
      showBadges &&
      badgeSuggestions.length > 0
    ) {
      ids.push(setTimeout(() => setBadgesRevealing(true), 0));
    }
    prevShowBadgesRef.current = showBadges;
    return () => ids.forEach((id) => clearTimeout(id));
  }, [showBadges, badgeSuggestions.length]);

  useEffect(() => {
    if (!badgesRevealing) return;
    const t = setTimeout(() => setBadgesRevealing(false), 300);
    return () => clearTimeout(t);
  }, [badgesRevealing]);

  useEffect(() => {
    if (!badgesFadingOut) return;
    const id = requestAnimationFrame(() => setBadgesFadeToZero(true));
    return () => cancelAnimationFrame(id);
  }, [badgesFadingOut]);

  useEffect(() => {
    if (!badgesFadeToZero) return;
    const t = setTimeout(() => {
      setBadgesFadingOut(false);
      setBadgesFadeToZero(false);
    }, 300);
    return () => clearTimeout(t);
  }, [badgesFadeToZero]);

  const handleAtBottomChange = useCallback((atBottom: boolean) => {
    setIsScrollAtBottom(atBottom);
  }, []);

  const lastToolPartKey = useMemo(() => {
    const lastMsg = messages.at(-1);
    if (!lastMsg) return null;
    for (let i = lastMsg.parts.length - 1; i >= 0; i--) {
      const p = lastMsg.parts[i];
      if (p?.type && String(p.type).startsWith('tool-')) {
        return `${lastMsg.id}-${i}`;
      }
    }
    return null;
  }, [messages]);

  const [openToolPartKeys, setOpenToolPartKeys] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const id = setTimeout(
      () =>
        setOpenToolPartKeys(
          lastToolPartKey ? new Set([lastToolPartKey]) : new Set(),
        ),
      0,
    );
    return () => clearTimeout(id);
  }, [lastToolPartKey]);

  const handleToolPartOpenChange = useCallback((key: string, open: boolean) => {
    setOpenToolPartKeys((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const prevViewSheetCountRef = useRef(0);

  useEffect(() => {
    const viewSheetEntries = Array.from(viewSheetRefs.current.entries());
    const currentCount = viewSheetEntries.length;

    if (
      currentCount > prevViewSheetCountRef.current &&
      viewSheetEntries.length > 0
    ) {
      const lastEntry = viewSheetEntries[viewSheetEntries.length - 1];
      if (lastEntry && lastEntry[1]) {
        lastEntry[1].scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }

    prevViewSheetCountRef.current = currentCount;
  }, [messages, status]);

  return (
    <PromptInputProvider initialInput={state.input}>
      <div
        ref={containerRef}
        className="relative flex h-full w-full flex-col overflow-x-hidden"
      >
        <div
          ref={conversationContainerRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overflow-x-hidden"
        >
          {conversationSlug ? (
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
                    editDatasources={editDatasources}
                    copiedMessagePartId={copiedMessagePartId}
                    datasources={datasources}
                    selectedDatasources={selectedDatasources}
                    pluginLogoMap={pluginLogoMap}
                    notebookContext={currentNotebookContext}
                    onEditStart={handleEditStart}
                    onEditSubmit={handleEditSubmit}
                    onEditCancel={handleEditCancel}
                    onEditTextChange={setEditText}
                    onEditDatasourcesChange={setEditDatasources}
                    onRegenerate={handleRegenerate}
                    onCopyPart={setCopiedMessagePartId}
                    onToolApproval={(approvalId, approved) =>
                      addToolApprovalResponse({ id: approvalId, approved })
                    }
                    sendMessage={sendMessage}
                    onPasteToNotebook={onPasteToNotebook}
                    onSubmitFeedback={onSubmitFeedback}
                    openToolPartKeys={openToolPartKeys}
                    onToolPartOpenChange={handleToolPartOpenChange}
                    onAtBottomChange={handleAtBottomChange}
                    contentSentinelRef={sentinelRef}
                    scrollerRef={scrollContainerRef}
                    onBeforeSuggestionSend={onBeforeSuggestionSend}
                    onDatasourceNameClick={onDatasourceNameClick}
                    getDatasourceTooltip={getDatasourceTooltip}
                    renderScrollButton={(scrollToBottom, isAtBottom) =>
                      !isAtBottom ? (
                        <Button
                          className="absolute bottom-4 left-[50%] z-50 translate-x-[-50%] rounded-full shadow-lg"
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
                </>
              )}
            </div>
          ) : (
            <Conversation
              ref={conversationContainerRef}
              className="min-h-0 min-w-0 flex-1 overflow-x-hidden"
            >
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
                        {(() => {
                          const lastTodoIndex = getLastTodoPartIndex(
                            message.parts,
                          );
                          return lastTodoIndex !== null ? (
                            <TodoPart
                              key={`${message.id}-todo`}
                              part={
                                message.parts[lastTodoIndex] as ToolUIPart & {
                                  type: 'tool-todowrite' | 'tool-todoread';
                                }
                              }
                              messageId={message.id}
                              index={lastTodoIndex}
                            />
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
                              const messageDatasources =
                                normalizeUIRole(message.role) === 'user'
                                  ? (() => {
                                      if (
                                        message.metadata &&
                                        typeof message.metadata === 'object'
                                      ) {
                                        const metadata =
                                          message.metadata as Record<
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
                                              datasources?.find(
                                                (ds) => ds.id === dsId,
                                              ),
                                            )
                                            .filter(
                                              (ds): ds is DatasourceItem =>
                                                ds !== undefined,
                                            );
                                          if (metadataDatasources.length > 0) {
                                            return metadataDatasources;
                                          }
                                        }
                                      }

                                      const lastUserMessage = [...messages]
                                        .reverse()
                                        .find((msg) => msg.role === 'user');

                                      const isLastUserMessage =
                                        lastUserMessage?.id === message.id;

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
                                            (ds): ds is DatasourceItem =>
                                              ds !== undefined,
                                          );
                                      }

                                      return undefined;
                                    })()
                                  : undefined;

                              return (
                                <div
                                  key={`${message.id}-${i}`}
                                  className={cn(
                                    'flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden',
                                    normalizeUIRole(message.role) === 'user' &&
                                      'justify-end',
                                    normalizeUIRole(message.role) ===
                                      'assistant' &&
                                      'animate-in fade-in slide-in-from-bottom-4 duration-300',
                                    normalizeUIRole(message.role) === 'user' &&
                                      'animate-in fade-in slide-in-from-bottom-4 duration-300',
                                  )}
                                >
                                  {normalizeUIRole(message.role) ===
                                    'assistant' && (
                                    <div className="mt-1 shrink-0">
                                      <BotAvatar
                                        size={6}
                                        isLoading={isStreaming}
                                      />
                                    </div>
                                  )}
                                  <div
                                    className={cn(
                                      'flex-end flex w-full min-w-0 flex-col justify-start gap-2 overflow-x-hidden',
                                      normalizeUIRole(message.role) ===
                                        'assistant' && 'mx-4 sm:mx-6',
                                      normalizeUIRole(message.role) ===
                                        'user' && isEditing
                                        ? 'max-w-full'
                                        : 'max-w-[80%]',
                                    )}
                                  >
                                    {isEditing &&
                                    normalizeUIRole(message.role) === 'user' ? (
                                      (() => {
                                        const {
                                          text: _cleanText,
                                          context: editContext,
                                        } = parseMessageWithContext(part.text);
                                        const hasContext =
                                          editContext?.lastAssistantResponse;

                                        return (
                                          <>
                                            {(hasContext ||
                                              (datasources &&
                                                pluginLogoMap)) && (
                                              <div className="mb-2 flex w-full min-w-0 items-center justify-between gap-2 overflow-x-hidden">
                                                {hasContext ? (
                                                  <div className="text-muted-foreground line-clamp-1 min-w-0 flex-1 text-xs">
                                                    <span className="font-medium">
                                                      Context:{' '}
                                                    </span>
                                                    {editContext.lastAssistantResponse?.substring(
                                                      0,
                                                      100,
                                                    )}
                                                    {(editContext
                                                      .lastAssistantResponse
                                                      ?.length ?? 0) > 100 &&
                                                      '...'}
                                                  </div>
                                                ) : (
                                                  <div className="flex-1" />
                                                )}
                                                {datasources &&
                                                  pluginLogoMap && (
                                                    <DatasourceSelector
                                                      selectedDatasources={
                                                        editDatasources
                                                      }
                                                      onSelectionChange={
                                                        setEditDatasources
                                                      }
                                                      datasources={datasources}
                                                      pluginLogoMap={
                                                        pluginLogoMap
                                                      }
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
                                                  onChange={(e) =>
                                                    setEditText(e.target.value)
                                                  }
                                                  className="bg-muted/50 text-foreground border-primary/30 focus:border-primary min-h-[60px] w-full resize-none rounded-lg border-2 px-4 py-3 text-sm focus:outline-none"
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === 'Enter' &&
                                                      (e.metaKey || e.ctrlKey)
                                                    ) {
                                                      e.preventDefault();
                                                      handleEditSubmit();
                                                    } else if (
                                                      e.key === 'Escape'
                                                    ) {
                                                      e.preventDefault();
                                                      handleEditCancel();
                                                    }
                                                  }}
                                                  autoFocus
                                                />
                                              </Message>
                                              <div className="mt-2 flex items-center justify-end gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={handleEditCancel}
                                                  className="h-8 px-3"
                                                >
                                                  <XIcon className="mr-1 size-3" />
                                                  Cancel
                                                </Button>
                                                <Button
                                                  variant="default"
                                                  size="sm"
                                                  onClick={handleEditSubmit}
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
                                        {normalizeUIRole(message.role) ===
                                        'user' ? (
                                          (() => {
                                            const { text, context } =
                                              parseMessageWithContext(
                                                part.text,
                                              );

                                            if (context) {
                                              return (
                                                <UserMessageBubble
                                                  key={`${message.id}-${i}`}
                                                  text={text}
                                                  context={context}
                                                  messageId={message.id}
                                                  messages={messages}
                                                  datasources={
                                                    messageDatasources
                                                  }
                                                  pluginLogoMap={pluginLogoMap}
                                                />
                                              );
                                            }

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
                                                    <div className="overflow-wrap-anywhere wrap-break-words">
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
                                                  <div className="overflow-wrap-anywhere wrap-break-words inline-flex min-w-0 items-baseline gap-0.5">
                                                    <StreamdownWithSuggestions
                                                      sendMessage={sendMessage}
                                                      messages={messages}
                                                      currentMessageId={
                                                        message.id
                                                      }
                                                      disabled={
                                                        !isChatIdle(status)
                                                      }
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
                                                      currentMessageId={
                                                        message.id
                                                      }
                                                      disabled={
                                                        !isChatIdle(status)
                                                      }
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
                                        {/* Actions below the bubble */}
                                        {(isResponseComplete ||
                                          (normalizeUIRole(message.role) ===
                                            'user' &&
                                            isLastTextPart)) && (
                                          <div
                                            className={cn(
                                              'mt-1 flex items-center gap-2',
                                              normalizeUIRole(message.role) ===
                                                'user' && 'justify-end',
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
                                            {normalizeUIRole(message.role) ===
                                              'user' &&
                                              !isChatActive(status) && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => {
                                                    const { text: cleanText } =
                                                      parseMessageWithContext(
                                                        part.text,
                                                      );
                                                    handleEditStart(
                                                      message.id,
                                                      cleanText,
                                                      messageDatasources?.map(
                                                        (ds) => ds.id,
                                                      ) ?? [],
                                                    );
                                                  }}
                                                  className="h-7 w-7"
                                                  title="Edit"
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
                                  {normalizeUIRole(message.role) === 'user' && (
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

                                const toolPartKey = `${message.id}-${i}`;
                                const isLastPart =
                                  i === message.parts.length - 1;

                                if (isToolInProgress) {
                                  return (
                                    <ToolPart
                                      key={toolPartKey}
                                      part={toolPart}
                                      messageId={message.id}
                                      index={i}
                                      executionTimeMs={getExecutionTimeMs(
                                        toolPart,
                                        message,
                                      )}
                                      open={openToolPartKeys.has(toolPartKey)}
                                      onOpenChange={(open) =>
                                        handleToolPartOpenChange(
                                          toolPartKey,
                                          open,
                                        )
                                      }
                                      defaultOpenWhenUncontrolled={isLastPart}
                                      onPasteToNotebook={onPasteToNotebook}
                                      notebookContext={currentNotebookContext}
                                    />
                                  );
                                }

                                return (
                                  <ToolPart
                                    key={toolPartKey}
                                    part={toolPart}
                                    messageId={message.id}
                                    index={i}
                                    executionTimeMs={getExecutionTimeMs(
                                      toolPart,
                                      message,
                                    )}
                                    open={openToolPartKeys.has(toolPartKey)}
                                    onOpenChange={(open) =>
                                      handleToolPartOpenChange(
                                        toolPartKey,
                                        open,
                                      )
                                    }
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
                  <div className="mx-auto w-full max-w-4xl px-6">
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
                  </div>
                )}
                <div ref={sentinelRef} className="h-px w-full" />
                <div className="h-32 w-full" aria-hidden />
              </ConversationContent>
              <ConversationScrollButton className="bottom-4" />
              <ScrollToBottomRefSetter scrollRef={scrollToBottomRef} />
            </Conversation>
          )}
        </div>

        <div className="bg-background border-border/10 relative z-40 shrink-0 border-t">
          {(messages.length === 0 &&
            ((isLoading && initialSuggestions?.length) ||
              badgeSuggestions.length > 0)) ||
          lastMessageHasSuggestions ||
          badgesFadingOut ? (
            <div
              className={cn(
                'absolute right-0 bottom-full left-0 z-50 flex justify-center pb-3 transition-all duration-300 ease-out',
                badgesRevealing &&
                  'animate-in fade-in slide-in-from-bottom-4 duration-300',
                badgesFadingOut
                  ? badgesFadeToZero
                    ? 'pointer-events-none translate-y-0 opacity-0'
                    : 'translate-y-0 opacity-100'
                  : showBadgeSlotVisible
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none invisible translate-y-4 opacity-0',
                !showSuggestionBadges &&
                  'pointer-events-none translate-y-2 opacity-0',
              )}
              data-test="suggestion-badges-container"
            >
              {isLoading && !badgesFadingOut ? (
                <SuggestionBadgesSkeleton />
              ) : (showBadges || badgesFadingOut) &&
                badgeSuggestions.length > 0 ? (
                <SuggestionBadges
                  suggestions={badgeSuggestions}
                  onSuggestionClick={handleBadgeSuggestionClick}
                  disabled={badgesFadingOut || !showSuggestionBadges}
                />
              ) : null}
            </div>
          ) : null}
          <div className="mx-auto w-full max-w-4xl px-6 pb-6">
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
              getDatasourcesForSend={getDatasourcesForSend}
              pluginLogoMap={pluginLogoMap}
              datasourcesLoading={datasourcesLoading}
              scrollToBottomRef={scrollToBottomRef}
              showSuggestionBadges={showSuggestionBadges}
              onShowSuggestionBadgesChange={setShowSuggestionBadges}
            />
          </div>
        </div>
      </div>

      <AlertDialog
        open={editWarningDialog.open}
        onOpenChange={(open) =>
          setEditWarningDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit this message?</AlertDialogTitle>
            <AlertDialogDescription>
              Editing this message will delete all subsequent messages in the
              conversation. The AI will generate a new response based on your
              edited message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditConfirmWithWarning}>
              Edit and regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  getDatasourcesForSend,
  pluginLogoMap,
  datasourcesLoading,
  scrollToBottomRef,
  showSuggestionBadges,
  onShowSuggestionBadgesChange,
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
  getDatasourcesForSend?: () => string[];
  pluginLogoMap?: Map<string, string>;
  datasourcesLoading?: boolean;
  scrollToBottomRef: React.RefObject<(() => void) | null>;
  showSuggestionBadges?: boolean;
  onShowSuggestionBadgesChange?: (value: boolean) => void;
}) {
  const attachments = usePromptInputAttachments();
  const controller = usePromptInputController();

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
      const ds = getDatasourcesForSend?.() ?? selectedDatasources ?? [];
      const bodyDatasources = ds.length > 0 ? ds : undefined;
      const sendPromise = sendMessage(
        {
          text: message.text || 'Sent with attachments',
          files: message.files,
        },
        {
          body: {
            model: state.model,
            webSearch: state.webSearch,
            datasources: bodyDatasources,
          },
        },
      );
      const scrollToBottom = () => scrollToBottomRef.current?.();
      requestAnimationFrame(scrollToBottom);
      setTimeout(scrollToBottom, 150);
      await sendPromise;
      attachments.clear();
    } catch {
      toast.error('Failed to send message. Please try again.');
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
      showSuggestionBadges={showSuggestionBadges}
      onShowSuggestionBadgesChange={onShowSuggestionBadgesChange}
    />
  );
}

export default function QweryAgentUI(props: QweryAgentUIProps) {
  return (
    <ToolVariantProvider>
      <QweryAgentUIContent {...props} />
    </ToolVariantProvider>
  );
}
