import { useMemo } from 'react';
import {
  isSuggestionPattern,
  extractAllSuggestionMatches,
  validateSuggestionElement,
} from '../utils/suggestion-pattern';
import type {
  SuggestionMatch,
  SuggestionMetadata,
} from '../utils/suggestion-pattern';

export interface DetectedSuggestion {
  element: Element;
  suggestionText: string;
  suggestionMatches?: SuggestionMatch[];
  suggestionMetadata?: SuggestionMetadata;
  isEndBlock?: boolean;
}

export interface UseSuggestionDetectionOptions {
  containerElement: HTMLElement | null;
  isReady: boolean;
  contentKey?: unknown;
}

export function useSuggestionDetection({
  containerElement,
  isReady,
  contentKey,
}: UseSuggestionDetectionOptions): DetectedSuggestion[] {
  return useMemo<DetectedSuggestion[]>(() => {
    if (!containerElement || !isReady) {
      return [];
    }

    try {
      const allElements = Array.from(
        containerElement.querySelectorAll('li, p'),
      );
      const nextDetected: DetectedSuggestion[] = [];

      allElements.forEach((element) => {
        if (element.querySelector('[data-suggestion-button]')) {
          return;
        }

        const elementText = element.textContent || '';

        if (isSuggestionPattern(elementText)) {
          const matches = extractAllSuggestionMatches(elementText);
          if (
            matches.length === 0 ||
            !validateSuggestionElement(element, elementText)
          ) {
            return;
          }
          const first = matches[0];
          if (!first) return;
          if (matches.length === 1) {
            nextDetected.push({
              element,
              suggestionText: first.text,
              suggestionMetadata: first.metadata,
            });
          } else {
            nextDetected.push({
              element,
              suggestionText: first.text,
              suggestionMatches: matches,
            });
          }
        }
      });

      if (nextDetected.length > 0) {
        nextDetected[nextDetected.length - 1] = {
          ...nextDetected[nextDetected.length - 1]!,
          isEndBlock: true,
        };
      }

      if (nextDetected.length > 0) {
        const withMeta = nextDetected.filter(
          (d) =>
            d.suggestionMetadata?.requiresDatasource ||
            (d.suggestionMatches?.some((m) => m.metadata?.requiresDatasource) ??
              false),
        );
        console.log('[SuggestionFlow] detection', {
          count: nextDetected.length,
          withRequiresDatasource: withMeta.length,
          sample: nextDetected[0]
            ? {
                text: nextDetected[0].suggestionText?.slice(0, 40),
                metadata: nextDetected[0].suggestionMetadata,
                hasMatches: !!nextDetected[0].suggestionMatches?.length,
              }
            : null,
        });
      }

      const key = contentKey;
      void key;
      return nextDetected;
    } catch (error) {
      console.error(
        '[useSuggestionDetection] Error detecting suggestions:',
        error,
      );
      return [];
    }
  }, [containerElement, isReady, contentKey]);
}
