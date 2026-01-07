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
  const [_isAtTop, setIsAtTop] = useState(false);
  const [wasAtBottomWhenStreamStarted, setWasAtBottomWhenStreamStarted] =
    useState(true);

  // Capture scroll position when stream starts
  useEffect(() => {
    if (status === 'streaming') {
      setWasAtBottomWhenStreamStarted(shouldFollowOutput);
    }
  }, [status, shouldFollowOutput]);

  const itemContent = useCallback(
    (index: number, message: UIMessage) => {
      // Validate message exists
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
          {...messageItemProps}
        />
      );
    },
    [messages, status, messageItemProps],
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
        if (
          status === 'submitted' ||
          (status === 'streaming' &&
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

  const shouldAutoScroll = wasAtBottomWhenStreamStarted && shouldFollowOutput;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        itemContent={itemContent}
        components={components}
        startReached={() => {
          // Only load if not already loading and there's more to load
          // This prevents rapid-fire requests when scrolling quickly
          if (!isLoadingOlder && hasMoreOlder && !loadError) {
            onLoadOlder().catch((error) => {
              // Error is already handled in loadOlderMessages, but catch here to prevent unhandled promise rejection
              console.error('Error in startReached callback:', error);
            });
          }
        }}
        followOutput={(atBottom) =>
          shouldAutoScroll && atBottom ? 'smooth' : false
        }
        atBottomStateChange={(atBottom) => {
          setShouldFollowOutput(atBottom);
          setIsAtBottom(atBottom);
        }}
        atTopStateChange={(_atTop) => {
          setIsAtTop(_atTop);
        }}
        overscan={200}
        alignToBottom
        style={{ height: '100%' }}
      />
      {renderScrollButton &&
        !isAtBottom &&
        // eslint-disable-next-line react-hooks/refs -- renderScrollButton is a render prop, scrollToBottom callback accesses refs internally but is stable
        renderScrollButton(scrollToBottom, isAtBottom)}
    </div>
  );
});

export type { VirtuosoHandle };
