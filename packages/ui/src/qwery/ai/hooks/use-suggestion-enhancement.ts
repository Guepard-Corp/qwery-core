import { useEffect, useRef, useCallback, useState } from 'react';
import type { useChat } from '@ai-sdk/react';
import {
  createSuggestionButton,
  generateSuggestionId,
  generateParentConversationId,
  cleanSuggestionPatterns,
  scrollToConversationBottom,
} from '../utils/suggestion-enhancement';
import type { DetectedSuggestion } from './use-suggestion-detection';

export interface UseSuggestionEnhancementOptions {
  detectedSuggestions: DetectedSuggestion[];
  containerRef: React.RefObject<HTMLElement | null>;
  sendMessage?: ReturnType<typeof useChat>['sendMessage'];
  contextMessages: {
    lastAssistantResponse?: string;
    parentConversationId?: string;
  };
}

export function useSuggestionEnhancement({
  detectedSuggestions,
  containerRef,
  sendMessage,
  contextMessages,
}: UseSuggestionEnhancementOptions): void {
  const processedElementsRef = useRef<Set<Element>>(new Set());
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setContainerElement(containerRef.current);
  }, [containerRef]);

  const handleSuggestionClick = useCallback(
    (cleanSuggestionText: string, sourceSuggestionId: string | undefined) => {
      if (!sendMessage) return;

      try {
        let messageText = cleanSuggestionText;
        const { lastAssistantResponse, parentConversationId } = contextMessages;

        if (lastAssistantResponse || sourceSuggestionId || parentConversationId) {
          const contextData = JSON.stringify({
            lastAssistantResponse,
            sourceSuggestionId,
            parentConversationId,
          });
          messageText = `__QWERY_CONTEXT__${contextData}__QWERY_CONTEXT_END__${cleanSuggestionText}`;
        }

        sendMessage({ text: messageText }, {});
        scrollToConversationBottom();
      } catch (error) {
        console.error(
          '[useSuggestionEnhancement] Error sending message:',
          error,
        );
      }
    },
    [sendMessage, contextMessages],
  );

  useEffect(() => {
    if (!containerElement || !sendMessage || detectedSuggestions.length === 0) {
      return;
    }

    const cleanupFunctions: Array<() => void> = [];
    let rafId: number | null = null;

    const processSuggestions = () => {
      try {
        cleanSuggestionPatterns(containerElement);

        detectedSuggestions.forEach(({ element, suggestionText }) => {
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
          const suggestionId = generateSuggestionId(suggestionText);

          const { cleanup } = createSuggestionButton(element, {
            suggestionText,
            suggestionId,
            handlers: {
              onClick: handleSuggestionClick,
            },
          });

          cleanupFunctions.push(cleanup);
        });
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
  ]);
}
