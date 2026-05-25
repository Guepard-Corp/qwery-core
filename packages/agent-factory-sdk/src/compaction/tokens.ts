import type { ModelMessage } from 'ai';

/**
 * Token estimation utilities. We DO NOT ship a tokenizer (would add ~MBs of
 * deps); the chars/4 heuristic is what pi and opencode both fall back to.
 * It overestimates slightly which is the safe side — we'd rather compact a
 * bit early than overflow.
 */

/** Tokens per character — conservative heuristic. */
const CHARS_PER_TOKEN = 4;

/** Hard cap on a single part's contribution to avoid runaway estimates. */
const MAX_PART_TOKENS = 50_000;

export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  const approx = Math.ceil(text.length / CHARS_PER_TOKEN);
  return Math.min(approx, MAX_PART_TOKENS);
}

/** Estimate the token cost of a single `ModelMessage` (AI SDK v6 shape). */
export function estimateMessageTokens(message: ModelMessage): number {
  let chars = 0;
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string') {
    chars += content.length;
  } else if (Array.isArray(content)) {
    for (const part of content as Array<Record<string, unknown>>) {
      if (typeof part.text === 'string') chars += part.text.length;
      else if (typeof part.input === 'object') chars += JSON.stringify(part.input).length;
      else if (typeof part.output === 'string') chars += part.output.length;
      else if (typeof part.output === 'object') chars += JSON.stringify(part.output).length;
    }
  }
  return Math.min(Math.ceil(chars / CHARS_PER_TOKEN), MAX_PART_TOKENS);
}

export function estimateTotalTokens(messages: ModelMessage[]): number {
  let total = 0;
  for (const m of messages) total += estimateMessageTokens(m);
  return total;
}
