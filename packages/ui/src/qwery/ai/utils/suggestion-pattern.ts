export interface SuggestionPattern {
  fullMatch: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

const SUGGESTION_PATTERN = /\{\{suggestion:\s*((?:(?!\}\})[\s\S])+)\}\}/;

export function detectSuggestionPattern(
  text: string,
): SuggestionPattern | null {
  const match = text.match(SUGGESTION_PATTERN);
  if (!match || match.index === undefined || !match[1]) return null;

  return {
    fullMatch: match[0],
    text: match[1].trim(),
    startIndex: match.index,
    endIndex: match.index + match[0].length,
  };
}

export function isSuggestionPattern(text: string): boolean {
  return detectSuggestionPattern(text) !== null;
}

export function extractSuggestionText(text: string): string | null {
  const pattern = detectSuggestionPattern(text);
  return pattern?.text ?? null;
}

const SUGGESTION_REGEX = /\{\{suggestion:\s*((?:(?!\}\})[\s\S])+)\}\}/g;

export function extractAllSuggestionTexts(text: string): string[] {
  return extractAllSuggestionMatches(text).map((m) => m.text);
}

export interface SuggestionMetadata {
  requiresDatasource?: boolean;
}

const METADATA_SEP = ' | ';
const REQUIRES_DATASOURCE_TAG = 'requiresDatasource';

export function parseSuggestionWithMetadata(content: string): {
  text: string;
  metadata: SuggestionMetadata;
} {
  const trimmed = content.trim();
  const sepIndex = trimmed.indexOf(METADATA_SEP);
  if (sepIndex === -1) return { text: trimmed, metadata: {} };
  const text = trimmed.slice(0, sepIndex).trim();
  const metaPart = trimmed.slice(sepIndex + METADATA_SEP.length).trim();
  const requiresDatasource =
    metaPart.toLowerCase() === REQUIRES_DATASOURCE_TAG.toLowerCase() ||
    metaPart.toLowerCase() === `${REQUIRES_DATASOURCE_TAG}: true`;
  const metadata = requiresDatasource ? { requiresDatasource: true } : {};
  if (Object.keys(metadata).length > 0) {
    console.log('[suggestion-pattern] parseSuggestionWithMetadata', {
      rawContent: content,
      text,
      metadataJson: JSON.stringify(metadata),
      metadata,
    });
  }
  return { text, metadata };
}

export interface SuggestionMatch {
  text: string;
  startIndex: number;
  endIndex: number;
  metadata?: SuggestionMetadata;
}

export function extractAllSuggestionMatches(text: string): SuggestionMatch[] {
  const result: SuggestionMatch[] = [];
  let match: RegExpExecArray | null;
  SUGGESTION_REGEX.lastIndex = 0;
  while ((match = SUGGESTION_REGEX.exec(text)) !== null && match[1]) {
    const { text: suggestionText, metadata } = parseSuggestionWithMetadata(
      match[1],
    );
    if (suggestionText && match.index !== undefined) {
      const item = {
        text: suggestionText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };
      result.push(item);
      if (item.metadata) {
        console.log('[suggestion-pattern] extractAllSuggestionMatches item', {
          text: item.text,
          metadataJson: JSON.stringify(item.metadata),
          metadata: item.metadata,
        });
      }
    }
  }
  return result;
}

const MAX_LEADING_PHRASE_LENGTH = 80;

export function isEntirelySuggestions(text: string): boolean {
  const rest = text.replace(SUGGESTION_REGEX, '').trim();
  if (rest.length === 0 || /^[,\s]*$/.test(rest)) return true;
  if (
    rest.length <= MAX_LEADING_PHRASE_LENGTH &&
    /^[^,]*(?:,\s*)*$/.test(rest)
  ) {
    return true;
  }
  return false;
}

export function validateSuggestionElement(
  _element: Element,
  text: string,
): boolean {
  const suggestions = extractAllSuggestionTexts(text);
  if (suggestions.length > 1) return true;

  const patternMatch = text.match(SUGGESTION_PATTERN);
  if (!patternMatch || patternMatch.index === undefined) return false;

  const afterPattern = text
    .substring(patternMatch.index + patternMatch[0].length)
    .trim();
  return afterPattern.length === 0 || afterPattern.length < 5;
}
