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
import { cn } from '../../lib/utils';
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
import { toToolError, toUserFacingError } from './user-facing-error';
import { useTranslation } from 'react-i18next';

const FullWidthScroller = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ style, ...props }, ref) => (
  <div
    ref={ref}
    style={style}
    className="w-full overflow-x-hidden overflow-y-auto"
    {...props}
  />
));
FullWidthScroller.displayName = 'FullWidthScroller';

const CenteredList = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ style, ...props }, ref) => (
  <div
    ref={ref}
    style={style}
    className="mx-auto w-full max-w-4xl px-6"
    {...props}
  />
));
CenteredList.displayName = 'CenteredList';

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
  onAtBottomChange?: (isAtBottom: boolean) => void;
  lastAssistantHasText?: boolean;
  lastMessageIsAssistant?: boolean;
  contentSentinelRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollerRef?: RefObject<HTMLDivElement | null>;
}

export interface VirtuosoMessageListRef {
  scrollToBottom: () => void;
}

export const VirtuosoMessageList = forwardRef<
  VirtuosoMessageListRef,
  VirtuosoMessageListProps
>(function VirtuosoMessageList(props, ref) {
  const { t } = useTranslation('common');
  const {
    messages,
    firstItemIndex,
    status,
    isLoadingOlder,
    hasMoreOlder,
    loadError,
    onLoadOlder,
    onRetryLoadOlder,
    conversationSlug,
    scrollToBottomRef,
    renderScrollButton,
    onAtBottomChange,
    lastAssistantHasText = false,
    lastMessageIsAssistant = false,
    contentSentinelRef,
    onScroll,
    scrollerRef,
    ...messageItemProps
  } = props;

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldFollowOutput, setShouldFollowOutput] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const wasAtBottomWhenStreamStartedRef = useRef(true);
  const [wasAtBottomWhenStreamStarted, setWasAtBottomWhenStreamStarted] =
    useState(true);

  const footerContext = useMemo(
    () => ({
      isLoadingOlder,
      loadError,
      onRetryLoadOlder,
      status,
      lastAssistantHasText,
      lastMessageIsAssistant,
      contentSentinelRef,
    }),
    [
      isLoadingOlder,
      loadError,
      onRetryLoadOlder,
      status,
      lastAssistantHasText,
      lastMessageIsAssistant,
      contentSentinelRef,
    ],
  );

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
      messageItemProps.editDatasources,
      messageItemProps.copiedMessagePartId,
      messageItemProps.datasources,
      messageItemProps.selectedDatasources,
      messageItemProps.pluginLogoMap,
      messageItemProps.notebookContext,
      messageItemProps.onEditStart,
      messageItemProps.onEditSubmit,
      messageItemProps.onEditCancel,
      messageItemProps.onEditTextChange,
      messageItemProps.onEditDatasourcesChange,
      messageItemProps.onRegenerate,
      messageItemProps.onCopyPart,
      messageItemProps.sendMessage,
      messageItemProps.onPasteToNotebook,
      messageItemProps.onSubmitFeedback,
      messageItemProps.openToolPartKeys,
      messageItemProps.onToolPartOpenChange,
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

  const itemContent = useCallback(
    (index: number, message: UIMessage) => {
      if (!message || !message.id) {
        console.warn('Invalid message at index', index);
        return null;
      }

      return (
        <div className={cn('pt-4 pb-4', index === 0 && 'pt-8')}>
          <MessageItem
            key={message.id}
            message={message}
            messages={messages}
            status={status}
            {...stableMessageItemProps}
            scrollToBottom={scrollToBottom}
          />
        </div>
      );
    },
    [messages, status, stableMessageItemProps, scrollToBottom],
  );

  const components = useMemo(() => {
    const scrollerRefStable = scrollerRef;
    const Scroller = forwardRef<
      HTMLDivElement,
      React.HTMLAttributes<HTMLDivElement>
    >((props, ref) => {
      return (
        <FullWidthScroller
          {...props}
          ref={(node) => {
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;

            if (scrollerRefStable) {
              if (typeof scrollerRefStable === 'function') {
                (scrollerRefStable as (node: HTMLDivElement | null) => void)(
                  node,
                );
              } else {
                (
                  scrollerRefStable as React.RefObject<HTMLDivElement | null>
                ).current = node;
              }
            }
          }}
        />
      );
    });
    Scroller.displayName = 'VirtuosoScroller';
    return {
      Scroller,
      List: CenteredList,
      Header: ({ context }: { context: typeof footerContext }) => {
        const state = context;
        if (state.isLoadingOlder) {
          return (
            <div className="flex items-center justify-center py-4">
              <Loader size={16} />
            </div>
          );
        }
        if (state.loadError) {
          return (
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="text-destructive text-sm">
                Failed to load messages
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={state.onRetryLoadOlder}
                className="text-sm underline hover:no-underline"
              >
                Retry
              </Button>
            </div>
          );
        }
        return null;
      },
      Footer: ({ context }: { context: typeof footerContext }) => {
        const state = context;
        const sentinel = state.contentSentinelRef ? (
          <div
            ref={state.contentSentinelRef}
            className="h-px min-h-px w-full"
            aria-hidden
          />
        ) : null;

        const spacer = <div className="h-32 w-full" aria-hidden />;

        if (state.loadError) {
          const { message, details } = toUserFacingError(
            toToolError(state.loadError),
            (key: string, params?: Record<string, unknown>) =>
              t(key, { defaultValue: key, ...(params ?? {}) }),
          );
          return (
            <>
              <div className="mx-auto w-full max-w-4xl px-6">
                <div className="animate-in fade-in slide-in-from-bottom-4 relative flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden pb-4 duration-300">
                  <BotAvatar
                    size={6}
                    isLoading={false}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2 overflow-x-hidden">
                    <Message
                      from="assistant"
                      className="w-full max-w-full min-w-0"
                    >
                      <MessageContent className="max-w-full min-w-0 overflow-x-hidden">
                        <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
                          <p className="font-medium">Error</p>
                          <p className="text-destructive/80 mt-1">{message}</p>
                          {details && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs underline">
                                View details
                              </summary>
                              <pre className="text-destructive/80 mt-2 text-xs whitespace-pre-wrap">
                                {details}
                              </pre>
                            </details>
                          )}
                        </div>
                      </MessageContent>
                    </Message>
                  </div>
                </div>
              </div>
              {sentinel}
              {spacer}
            </>
          );
        }
        if (
          isChatSubmitted(state.status) ||
          (isChatStreaming(state.status) &&
            (!state.lastAssistantHasText || !state.lastMessageIsAssistant))
        ) {
          return (
            <>
              <div className="mx-auto w-full max-w-4xl px-6">
                <div className="animate-in fade-in slide-in-from-bottom-4 relative flex max-w-full min-w-0 items-start gap-3 overflow-x-hidden pb-4 duration-300">
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
              {sentinel}
              {spacer}
            </>
          );
        }
        return (
          <>
            {sentinel}
            {spacer}
          </>
        );
      },
    };
  }, [scrollerRef, t]);

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

  const hasPerformedInitialScrollRef = useRef(false);

  useEffect(() => {
    if (conversationSlug !== undefined) {
      hasPerformedInitialScrollRef.current = false;
    }
  }, [conversationSlug]);

  useEffect(() => {
    if (
      !hasPerformedInitialScrollRef.current &&
      messages.length > 0 &&
      virtuosoRef.current
    ) {
      const id = requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          behavior: 'auto',
          align: 'end',
        });
      });
      hasPerformedInitialScrollRef.current = true;
      return () => cancelAnimationFrame(id);
    }
  }, [messages.length, conversationSlug]);

  useEffect(() => {
    if (conversationSlug === undefined) return;

    const t = setTimeout(() => {
      if (messages.length > 0 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index: messages.length - 1,
          behavior: 'auto',
          align: 'end',
        });
      }
    }, 150);

    return () => clearTimeout(t);
  }, [conversationSlug]);

  const shouldAutoScroll = wasAtBottomWhenStreamStarted && shouldFollowOutput;

  const lastMessageContentKey = useMemo(() => {
    const last = messages.at(-1);
    if (!last?.parts) return '';
    return last.parts
      .map((p) =>
        p && typeof p === 'object' && 'text' in p
          ? String((p as { text?: string }).text ?? '').length
          : 0,
      )
      .join(',');
  }, [messages]);

  useEffect(() => {
    if (
      messages.length <= 1 ||
      !isChatStreaming(status) ||
      !shouldAutoScroll ||
      !virtuosoRef.current
    ) {
      return;
    }
    const scrollLastIntoView = () => {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        behavior: 'auto',
        align: 'end',
      });
    };
    const id1 = requestAnimationFrame(scrollLastIntoView);
    const t0 = setTimeout(scrollLastIntoView, 0);
    const t1 = setTimeout(scrollLastIntoView, 50);
    const t2 = setTimeout(scrollLastIntoView, 150);
    return () => {
      cancelAnimationFrame(id1);
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [lastMessageContentKey, status, shouldAutoScroll, messages.length]);
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
        computeItemKey={(_index, message) => message?.id ?? _index}
        scrollIntoViewOnChange={() => undefined}
        context={footerContext}
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
          shouldAutoScroll && atBottom ? 'auto' : false
        }
        atBottomStateChange={(atBottom: boolean) => {
          setShouldFollowOutput(atBottom);
          setIsAtBottom(atBottom);
          onAtBottomChange?.(atBottom);
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
        skipAnimationFrameInResizeObserver
        style={{ height: '100%', overflowX: 'hidden' }}
        onScroll={onScroll}
      />
      {renderScrollButton &&
        !isAtBottom &&
        renderScrollButton(scrollToBottom, isAtBottom)}
    </div>
  );
});

export type { VirtuosoHandle };
