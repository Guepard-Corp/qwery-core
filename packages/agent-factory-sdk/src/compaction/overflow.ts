/**
 * Overflow detection. The output budget we reserve mirrors opencode's
 * `COMPACTION_BUFFER` (20k tokens) — enough headroom for the next assistant
 * response without compaction triggering at every turn.
 */

export const DEFAULT_RESERVED_OUTPUT = 20_000;

export interface UsableInput {
  /** Hard model context window (e.g. 200_000 for Claude 3.x). */
  contextLimit: number;
  /**
   * Optional max output token budget (provider-side). If known, we subtract
   * it from the usable window instead of the default reserved buffer.
   */
  maxOutputTokens?: number;
  /** Override the reserved buffer (advanced users only). */
  reserved?: number;
}

/** Tokens we can actually pack into the prompt before the model rejects it. */
export function usable(input: UsableInput): number {
  if (!input.contextLimit || input.contextLimit <= 0) return 0;
  const reserved = input.reserved ?? input.maxOutputTokens ?? DEFAULT_RESERVED_OUTPUT;
  return Math.max(0, input.contextLimit - reserved);
}

export interface IsOverflowInput extends UsableInput {
  /** Current prompt-side token count (last assistant usage.inputTokens). */
  promptTokens: number;
}

export function isOverflow(input: IsOverflowInput): boolean {
  if (!input.contextLimit || input.contextLimit <= 0) return false;
  return input.promptTokens >= usable(input);
}

/** Tail-preservation budget — how many recent tokens to keep verbatim. */
export interface PreserveTailBudgetInput {
  contextLimit: number;
  maxOutputTokens?: number;
  reserved?: number;
  /** Override fraction of usable context to keep as tail (default 25%). */
  fraction?: number;
  /** Lower bound on tail size (default 2k). */
  minTokens?: number;
  /** Upper bound on tail size (default 8k). */
  maxTokens?: number;
}

export const DEFAULT_PRESERVE_TAIL_MIN = 2_000;
export const DEFAULT_PRESERVE_TAIL_MAX = 8_000;
export const DEFAULT_PRESERVE_TAIL_FRACTION = 0.25;

export function preserveTailBudget(input: PreserveTailBudgetInput): number {
  const u = usable(input);
  const fraction = input.fraction ?? DEFAULT_PRESERVE_TAIL_FRACTION;
  const min = input.minTokens ?? DEFAULT_PRESERVE_TAIL_MIN;
  const max = input.maxTokens ?? DEFAULT_PRESERVE_TAIL_MAX;
  return Math.min(max, Math.max(min, Math.floor(u * fraction)));
}
