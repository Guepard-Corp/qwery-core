import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { useChat } from '@ai-sdk/react';
import {
  createSuggestionButton,
  injectMultipleSuggestionButtons,
  generateSuggestionId,
  cleanSuggestionPatterns,
} from '../utils/suggestion-enhancement';
import {
  isSuggestionPattern,
  isEntirelySuggestions,
} from '../utils/suggestion-pattern';
import type { SuggestionMetadata } from '../utils/suggestion-pattern';
import type { DetectedSuggestion } from './use-suggestion-detection';

export interface UseSuggestionEnhancementOptions {
  detectedSuggestions: DetectedSuggestion[];
  containerElement: HTMLElement | null;
  sendMessage?: ReturnType<typeof useChat>['sendMessage'];
  contextMessages: {
    lastAssistantResponse?: string;
    parentConversationId?: string;
  };
  scrollToBottom?: () => void;
  disabled?: boolean;
  isLastAgentResponse?: boolean;
  onBeforeSuggestionSend?: (
    text: string,
    metadata?: SuggestionMetadata,
  ) => Promise<boolean>;
}

export function useSuggestionEnhancement({
  detectedSuggestions,
  containerElement,
  sendMessage,
  contextMessages,
  scrollToBottom,
  disabled = false,
  isLastAgentResponse = true,
  onBeforeSuggestionSend,
}: UseSuggestionEnhancementOptions): void {
  const applyOmit = isLastAgentResponse;
  const processedElementsRef = useRef<Set<Element>>(new Set());
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    if (!containerElement) return;
    const buttons = containerElement.querySelectorAll('[data-suggestion-btn]');
    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      if (disabled) {
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
      } else {
        el.style.opacity = '';
        el.style.pointerEvents = '';
      }
    });
  }, [containerElement, disabled]);

  const handleSuggestionClick = useCallback(
    async (
      cleanSuggestionText: string,
      sourceSuggestionId: string | undefined,
      metadata?: SuggestionMetadata,
    ) => {
      console.log('[SuggestionFlow] handleSuggestionClick', {
        text: cleanSuggestionText?.slice(0, 50),
        metadata,
        hasOnBefore: !!onBeforeSuggestionSend,
      });
      if (disabledRef.current || !sendMessage) {
        if (disabledRef.current) {
          // Agent is not idle – show a gentle toast and ignore the click
          try {
            toast(
              'Agent is still processing. Please wait before using suggestions.',
            );
          } catch {
            // ignore toast errors in non-browser environments
          }
        }
        return;
      }

      try {
        const ok =
          onBeforeSuggestionSend === undefined
            ? true
            : await onBeforeSuggestionSend(cleanSuggestionText, metadata);
        if (!ok) return;

        let messageText = cleanSuggestionText;
        const { lastAssistantResponse, parentConversationId } = contextMessages;

        if (
          lastAssistantResponse ||
          sourceSuggestionId ||
          parentConversationId
        ) {
          const contextData = JSON.stringify({
            lastAssistantResponse,
            sourceSuggestionId,
            parentConversationId,
          });
          messageText = `__QWERY_CONTEXT__${contextData}__QWERY_CONTEXT_END__${cleanSuggestionText}`;
        }

        sendMessage({ text: messageText }, {});
        scrollToBottom?.();
      } catch (error) {
        console.error(
          '[useSuggestionEnhancement] Error sending message:',
          error,
        );
      }
    },
    [sendMessage, contextMessages, scrollToBottom, onBeforeSuggestionSend],
  );

  useEffect(() => {
    if (!containerElement || !sendMessage || detectedSuggestions.length === 0) {
      return;
    }

    const cleanupFunctions: Array<() => void> = [];
    let rafId: number | null = null;

    const processSuggestions = () => {
      try {
        if (applyOmit) {
          const lists = containerElement.querySelectorAll('ul, ol');
          lists.forEach((list) => {
            const items = Array.from(list.querySelectorAll('li'));
            if (
              items.length > 0 &&
              items.every((li) => isSuggestionPattern(li.textContent || ''))
            ) {
              const prev = list.previousElementSibling;
              if (prev?.tagName === 'P') {
                prev.textContent = '';
              }
              list.innerHTML = '';
            }
          });

          containerElement.querySelectorAll('p').forEach((p) => {
            const text = p.textContent || '';
            if (isSuggestionPattern(text) && isEntirelySuggestions(text)) {
              p.textContent = '';
            }
          });
        }

        cleanSuggestionPatterns(containerElement);

        detectedSuggestions.forEach(
          ({
            element,
            suggestionText,
            suggestionMatches,
            suggestionMetadata,
          }) => {
            if (!element.isConnected) {
              return;
            }

            if (
              element.querySelector('[data-suggestion-button]') ||
              processedElementsRef.current.has(element)
            ) {
              return;
            }

            processedElementsRef.current.add(element);

            const tagName = element.tagName;
            const elementText = element.textContent || '';

            if (
              applyOmit &&
              tagName === 'P' &&
              isEntirelySuggestions(elementText)
            ) {
              element.textContent = '';
              return;
            }

            let omitText = isLastAgentResponse && tagName === 'LI';

            if (suggestionMatches && suggestionMatches.length > 1) {
              const { cleanup } = injectMultipleSuggestionButtons(
                element,
                suggestionMatches,
                { onClick: handleSuggestionClick },
                generateSuggestionId,
                { omitText },
              );
              cleanupFunctions.push(cleanup);
            } else if (suggestionText) {
              const suggestionId = generateSuggestionId(suggestionText);
              const { cleanup } = createSuggestionButton(
                element,
                {
                  suggestionText,
                  suggestionId,
                  handlers: {
                    onClick: handleSuggestionClick,
                  },
                  metadata: suggestionMetadata,
                },
                { omitText },
              );
              cleanupFunctions.push(cleanup);
            }
          },
        );
      } catch (error) {
        console.error(
          '[useSuggestionEnhancement] Error processing suggestions:',
          error,
        );
      }
    };

    rafId = requestAnimationFrame(processSuggestions);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      cleanupFunctions.forEach((cleanup) => cleanup());
      // Copy ref value to avoid accessing ref in cleanup
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const processedElements = processedElementsRef.current;
      if (processedElements) {
        processedElements.clear();
      }
    };
  }, [
    detectedSuggestions,
    containerElement,
    sendMessage,
    handleSuggestionClick,
    isLastAgentResponse,
    onBeforeSuggestionSend,
  ]);
}
