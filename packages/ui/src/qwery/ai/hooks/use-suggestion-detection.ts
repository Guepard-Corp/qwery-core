import { useMemo } from 'react';
import {
  isSuggestionPattern,
  extractSuggestionText,
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

export function useSuggestionDetection(
  containerElement: HTMLElement | null,
  isReady: boolean,
): DetectedSuggestion[] {
  return useMemo(() => {
    if (!containerElement || !isReady) {
      return [];
    }

    try {
      const allElements = Array.from(
        containerElement.querySelectorAll('li, p'),
      );
      const detected: DetectedSuggestion[] = [];

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
            detected.push({
              element,
              suggestionText: first.text,
              suggestionMetadata: first.metadata,
            });
          } else {
            detected.push({
              element,
              suggestionText: first.text,
              suggestionMatches: matches,
            });
          }
        }
      });

      if (detected.length > 0) {
        detected[detected.length - 1] = {
          ...detected[detected.length - 1]!,
          isEndBlock: true,
        };
      }

      if (detected.length > 0) {
        const withMeta = detected.filter(
          (d) =>
            d.suggestionMetadata?.requiresDatasource ||
            (d.suggestionMatches?.some((m) => m.metadata?.requiresDatasource) ??
              false),
        );
        console.log('[SuggestionFlow] detection', {
          count: detected.length,
          withRequiresDatasource: withMeta.length,
          sample: detected[0]
            ? {
                text: detected[0].suggestionText?.slice(0, 40),
                metadata: detected[0].suggestionMetadata,
                hasMatches: !!detected[0].suggestionMatches?.length,
              }
            : null,
        });
      }

      return detected;
    } catch (error) {
      console.error(
        '[useSuggestionDetection] Error detecting suggestions:',
        error,
      );
      return [];
    }
  }, [containerElement, isReady]);
}
