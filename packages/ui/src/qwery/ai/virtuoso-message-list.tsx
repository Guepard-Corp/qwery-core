'use client';

import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import {
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  ReactNode,
  RefObject,
} from 'react';
import type { UIMessage } from 'ai';
import type { ChatStatus } from 'ai';
import { MessageItem, type MessageItemProps } from './message-item';
import { isChatStreaming, isChatSubmitted } from './utils/chat-status';
import { Loader } from '../../ai-elements/loader';
import { Button } from '../../shadcn/button';
import { BotAvatar } from '../bot-avatar';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '../../ai-elements/message';

interface VirtuosoMessageListProps extends Omit<MessageItemProps, 'message'> {
  messages: UIMessage[];
  firstItemIndex: number;
  status: ChatStatus | undefined;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
  loadError: Error | null;
  onLoadOlder: () => Promise<void>;
  onRetryLoadOlder: () => void;
  conversationSlug?: string;
  scrollToBottomRef?: RefObject<(() => void) | null>;
  renderScrollButton?: (
    scrollToBottom: () => void,
    isAtBottom: boolean,
  ) => ReactNode;
  lastAssistantHasText?: boolean;
  lastMessageIsAssistant?: boolean;
}

export interface VirtuosoMessageListRef {
  scrollToBottom: () => void;
}

export const VirtuosoMessageList = forwardRef<
  VirtuosoMessageListRef,
  VirtuosoMessageListProps
>(function VirtuosoMessageList(props, ref) {
  const {
    messages,
    firstItemIndex,
    status,
    isLoadingOlder,
    hasMoreOlder,
    loadError,
    onLoadOlder,
    onRetryLoadOlder,
    conversationSlug: _conversationSlug,
    scrollToBottomRef,
    renderScrollButton,
    lastAssistantHasText = false,
    lastMessageIsAssistant = false,
    ...messageItemProps
  } = props;

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldFollowOutput, setShouldFollowOutput] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const wasAtBottomWhenStreamStartedRef = useRef(true);
  const [wasAtBottomWhenStreamStarted, setWasAtBottomWhenStreamStarted] =
    useState(true);

  useEffect(() => {
    if (isChatStreaming(status)) {
      const value = shouldFollowOutput;
      wasAtBottomWhenStreamStartedRef.current = value;
      setWasAtBottomWhenStreamStarted(value);
    }
  }, [status, shouldFollowOutput]);

  const stableMessageItemProps = useMemo(
    () => messageItemProps,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      messageItemProps.lastAssistantMessage,
      messageItemProps.editingMessageId,
      messageItemProps.editText,
      messageItemProps.copiedMessagePartId,
      messageItemProps.datasources,
      messageItemProps.selectedDatasources,
      messageItemProps.pluginLogoMap,
      messageItemProps.notebookContext,
      messageItemProps.onEditSubmit,
      messageItemProps.onEditCancel,
      messageItemProps.onEditTextChange,
      messageItemProps.onRegenerate,
      messageItemProps.onCopyPart,
      messageItemProps.sendMessage,
      messageItemProps.onPasteToNotebook,
    ],
  );

  const itemContent = useCallback(
    (index: number, message: UIMessage) => {
      if (!message || !message.id) {
        console.warn('Invalid message at index', index);
        return null;
      }

      return (
        <MessageItem
          key={message.id}
          message={message}
          messages={messages}
          status={status}
          {...stableMessageItemProps}
        />
      );
    },
    [messages, status, stableMessageItemProps],
  );

  const components = useMemo(
    () => ({
      Header: () => {
        if (isLoadingOlder) {
          return (
            <div className="flex items-center justify-center py-4">
              <Loader size={16} />
            </div>
          );
        }
        if (loadError) {
          return (
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="text-destructive text-sm">
                Failed to load messages
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetryLoadOlder}
                className="text-sm underline hover:no-underline"
              >
                Retry
              </Button>
            </div>
          );
        }
        return null;
      },
      Footer: () => {
        if (loadError) {
          return (
            <div className="animate-in fade-in slide-in-from-bottom-4 relative flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden pb-4 duration-300">
              <BotAvatar size={6} isLoading={false} className="mt-1 shrink-0" />
              <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2 overflow-x-hidden">
                <Message from="assistant" className="w-full max-w-full min-w-0">
                  <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                    <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
                      <p className="font-medium">Error</p>
                      <p className="text-destructive/80 mt-1">
                        {loadError.message ??
                          'Failed to get response from agent. Please try again.'}
                      </p>
                    </div>
                  </MessageContent>
                </Message>
              </div>
            </div>
          );
        }
        if (
          isChatSubmitted(status) ||
          (isChatStreaming(status) &&
            (!lastAssistantHasText || !lastMessageIsAssistant))
        ) {
          return (
            <div className="animate-in fade-in slide-in-from-bottom-4 relative flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden pb-4 duration-300">
              <BotAvatar size={6} isLoading={true} className="mt-1 shrink-0" />
              <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2 overflow-x-hidden">
                <Message from="assistant" className="w-full max-w-full min-w-0">
                  <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                    <div className="overflow-wrap-anywhere inline-flex min-w-0 items-baseline gap-0.5 break-words">
                      <MessageResponse></MessageResponse>
                    </div>
                  </MessageContent>
                </Message>
              </div>
            </div>
          );
        }
        return null;
      },
    }),
    [
      isLoadingOlder,
      loadError,
      onRetryLoadOlder,
      status,
      lastAssistantHasText,
      lastMessageIsAssistant,
    ],
  );

  const scrollToBottom = useCallback(() => {
    const ref = virtuosoRef.current;
    if (messages.length > 0 && ref) {
      ref.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
        align: 'end',
      });
    }
  }, [messages.length]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom,
    }),
    [scrollToBottom],
  );

  useEffect(() => {
    if (scrollToBottomRef) {
      scrollToBottomRef.current = scrollToBottom;
    }
  }, [scrollToBottom, scrollToBottomRef]);

  // Scroll to bottom on initial mount if messages exist
  const hasPerformedInitialScrollRef = useRef(false);
  const previousMessagesLengthRef = useRef(messages.length);
  const previousLastMessageIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!hasPerformedInitialScrollRef.current && messages.length > 0) {
      const wasEmpty = previousMessagesLengthRef.current === 0;
      const isFirstRender =
        previousMessagesLengthRef.current === messages.length;

      if ((wasEmpty || isFirstRender) && virtuosoRef.current) {
        const timeoutId = setTimeout(() => {
          if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
              index: messages.length - 1,
              behavior: 'auto',
              align: 'end',
            });
            hasPerformedInitialScrollRef.current = true;
          }
        }, 0);
        previousMessagesLengthRef.current = messages.length;
        if (messages.length > 0) {
          previousLastMessageIdRef.current = messages[messages.length - 1]?.id;
        }
        return () => clearTimeout(timeoutId);
      }
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Force scroll when a new assistant message appears (to ensure visibility)
  useEffect(() => {
    if (messages.length === 0 || !virtuosoRef.current) return;

    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id;
    const previousLastMessageId = previousLastMessageIdRef.current;

    // Check if a new message was added (different ID) and it's from assistant
    if (
      lastMessageId &&
      lastMessageId !== previousLastMessageId &&
      lastMessage.role === 'assistant'
    ) {
      // Force scroll to show the new assistant message
      // Use multiple timeouts to ensure DOM is updated and message is rendered
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
              index: messages.length - 1,
              behavior: 'auto',
              align: 'end',
            });
          }
        }, 0);
        setTimeout(() => {
          if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
              index: messages.length - 1,
              behavior: 'auto',
              align: 'end',
            });
          }
        }, 50);
        setTimeout(() => {
          if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
              index: messages.length - 1,
              behavior: 'auto',
              align: 'end',
            });
          }
        }, 150);
      });
    }

    // Update the ref to track the last message ID
    if (lastMessageId) {
      previousLastMessageIdRef.current = lastMessageId;
    }
  }, [messages]);

  const shouldAutoScroll = wasAtBottomWhenStreamStarted && shouldFollowOutput;
  return (
    <div
      ref={containerRef}
      className="virtuoso-message-container relative h-full w-full overflow-x-hidden"
    >
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        itemContent={itemContent}
        components={components}
        startReached={() => {
          if (!isLoadingOlder && hasMoreOlder && !loadError) {
            onLoadOlder().catch((error) => {
              console.error('Error in startReached callback:', error);
            });
          }
        }}
        followOutput={(atBottom: boolean) =>
          shouldAutoScroll && atBottom ? 'smooth' : false
        }
        atBottomStateChange={(atBottom: boolean) => {
          setShouldFollowOutput(atBottom);
          setIsAtBottom(atBottom);
        }}
        overscan={{
          main: 500,
          reverse: 200,
        }}
        increaseViewportBy={{
          top: 400,
          bottom: 600,
        }}
        alignToBottom
        style={{ height: '100%', overflowX: 'hidden' }}
      />
      {renderScrollButton &&
        !isAtBottom &&
        renderScrollButton(scrollToBottom, isAtBottom)}
    </div>
  );
});

export type { VirtuosoHandle };
