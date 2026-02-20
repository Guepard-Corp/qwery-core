'use client';

import { useRef, memo, useMemo, useCallback, useEffect, useState } from 'react';
import { MessageResponse } from '../../ai-elements/message';
import type { UIMessage } from 'ai';
import type { useChat } from '@ai-sdk/react';
import { cn } from '../../lib/utils';
import { getContextMessages } from './utils/message-context';
import { useStreamdownReady } from './hooks/use-streamdown-ready';
import { useDebouncedValue } from './hooks/use-debounced-value';
import { useSuggestionDetection } from './hooks/use-suggestion-detection';
import { useSuggestionEnhancement } from './hooks/use-suggestion-enhancement';
import type { SuggestionMetadata } from './utils/suggestion-pattern';

const QWERY_DATASOURCE_PREFIX = 'qwery-datasource:';
const BLOCKED_TITLE_PREFIX = 'Blocked URL: ';

function replaceBlockedDatasourceSpans(
  container: HTMLElement,
  onDatasourceNameClick: ((id: string, name: string) => void) | undefined,
  getDatasourceTooltip: ((id: string) => string) | undefined,
) {
  if (!onDatasourceNameClick) return;
  const spans = container.querySelectorAll<HTMLSpanElement>(
    `span[title^="${BLOCKED_TITLE_PREFIX}${QWERY_DATASOURCE_PREFIX}"]`,
  );
  spans.forEach((span) => {
    const title = span.getAttribute('title');
    if (!title) return;
    const href = title.slice(BLOCKED_TITLE_PREFIX.length).trim();
    const id = href.startsWith(QWERY_DATASOURCE_PREFIX)
      ? href.slice(QWERY_DATASOURCE_PREFIX.length).trim()
      : '';
    if (!id) return;
    const name = (span.textContent ?? '')
      .replace(/\s*\[blocked\]\s*$/i, '')
      .trim();
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-qwery-datasource-id', id);
    button.setAttribute('data-qwery-datasource-name', name);
    button.textContent = name || id;
    const tooltip = getDatasourceTooltip?.(id) ?? name;
    if (tooltip) button.title = tooltip;
    button.className = cn(
      'text-primary decoration-primary/50 hover:decoration-primary',
      'overflow-wrap-anywhere cursor-pointer break-words underline underline-offset-2',
      'font-inherit border-0 bg-transparent p-0 text-inherit transition',
    );
    span.parentNode?.replaceChild(button, span);
  });
}

export interface StreamdownWithSuggestionsProps {
  children: string;
  className?: string;
  sendMessage?: ReturnType<typeof useChat>['sendMessage'];
  messages?: UIMessage[];
  currentMessageId?: string;
  scrollToBottom?: () => void;
  disabled?: boolean;
  isLastAgentResponse?: boolean;
  onBeforeSuggestionSend?: (
    text: string,
    metadata?: SuggestionMetadata,
  ) => Promise<boolean>;
  onDatasourceNameClick?: (id: string, name: string) => void;
  getDatasourceTooltip?: (id: string) => string;
}

export const StreamdownWithSuggestions = memo(
  ({
    className,
    children,
    sendMessage,
    messages,
    currentMessageId,
    scrollToBottom,
    disabled = false,
    isLastAgentResponse = true,
    onBeforeSuggestionSend,
    onDatasourceNameClick,
    getDatasourceTooltip,
  }: StreamdownWithSuggestionsProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
    const setContainerRef = useCallback((node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
      setContainerEl(node);
    }, []);

    const contextMessages = useMemo(
      () => getContextMessages(messages, currentMessageId, children),
      [messages, currentMessageId, children],
    );

    const isStreamdownReady = useStreamdownReady(containerRef);
    const _debouncedChildren = useDebouncedValue(children, 150);

    const detectedSuggestions = useSuggestionDetection(
      containerEl,
      isStreamdownReady,
    );

    useSuggestionEnhancement({
      detectedSuggestions,
      containerElement: containerEl,
      sendMessage,
      contextMessages,
      scrollToBottom,
      disabled,
      isLastAgentResponse,
      onBeforeSuggestionSend,
    });

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const run = () =>
        replaceBlockedDatasourceSpans(
          container,
          onDatasourceNameClick,
          getDatasourceTooltip,
        );
      run();
      const id = requestAnimationFrame(run);
      const t = setTimeout(run, 100);
      return () => {
        cancelAnimationFrame(id);
        clearTimeout(t);
      };
    }, [children, onDatasourceNameClick, getDatasourceTooltip]);

    const handleContainerClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const datasourceButton = target.closest<HTMLElement>(
          '[data-qwery-datasource-id]',
        );
        if (datasourceButton) {
          e.preventDefault();
          e.stopPropagation();
          const id = datasourceButton.getAttribute('data-qwery-datasource-id');
          const name =
            datasourceButton.getAttribute('data-qwery-datasource-name') ?? '';
          if (id && onDatasourceNameClick) {
            onDatasourceNameClick(id, name);
          }
          return;
        }
        const link = target.closest('a');
        const href = link?.getAttribute?.('href');
        if (
          link &&
          typeof href === 'string' &&
          href.startsWith(QWERY_DATASOURCE_PREFIX)
        ) {
          e.preventDefault();
          e.stopPropagation();
          const id = href.slice(QWERY_DATASOURCE_PREFIX.length).trim();
          const name = (link.textContent || '').trim();
          if (id && onDatasourceNameClick) {
            onDatasourceNameClick(id, name);
          }
        }
      },
      [onDatasourceNameClick],
    );

    return (
      <div
        ref={setContainerRef}
        className={cn('w-full max-w-full min-w-0', className)}
        style={{ maxWidth: '100%' }}
        onClick={handleContainerClick}
      >
        <MessageResponse>{children}</MessageResponse>
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.sendMessage === nextProps.sendMessage &&
    prevProps.messages === nextProps.messages &&
    prevProps.currentMessageId === nextProps.currentMessageId &&
    prevProps.scrollToBottom === nextProps.scrollToBottom &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.isLastAgentResponse === nextProps.isLastAgentResponse &&
    prevProps.onBeforeSuggestionSend === nextProps.onBeforeSuggestionSend &&
    prevProps.onDatasourceNameClick === nextProps.onDatasourceNameClick &&
    prevProps.getDatasourceTooltip === nextProps.getDatasourceTooltip,
);

StreamdownWithSuggestions.displayName = 'StreamdownWithSuggestions';
