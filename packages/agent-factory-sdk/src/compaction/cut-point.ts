import type { ModelMessage } from 'ai';
import { estimateMessageTokens } from './tokens';

/**
 * Head/tail split: identify where to cut so that the tail (kept verbatim)
 * fits under `tailBudget` tokens, and the head (summarized) covers
 * everything before. Cuts only at user-message boundaries to avoid splitting
 * a tool call from its result. Falls back to inside-turn split when no
 * boundary fits (opencode-style `splitTurn`).
 */

export interface CutPointResult {
  /** Index in `messages` where the tail starts (0 means everything is tail). */
  tailStartIndex: number;
  /** Estimated tokens kept in the tail. */
  tailTokens: number;
  /** Whether we had to split inside a turn rather than at a user boundary. */
  splitInsideTurn: boolean;
}

/** Indices of user messages (= turn starts). */
function userTurnIndices(messages: ModelMessage[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]!.role === 'user') out.push(i);
  }
  return out;
}

/**
 * Walk backward through turn starts, accumulating turn sizes. Stop at the
 * earliest turn start whose suffix still fits the budget.
 */
function findTurnBoundaryCut(
  messages: ModelMessage[],
  tailBudget: number,
): { tailStartIndex: number; tailTokens: number } {
  const turnStarts = userTurnIndices(messages);
  if (turnStarts.length === 0) {
    return { tailStartIndex: 0, tailTokens: 0 };
  }
  let runningTokens = 0;
  let chosen = messages.length; // default: nothing kept
  for (let t = turnStarts.length - 1; t >= 0; t--) {
    const start = turnStarts[t]!;
    const end = t + 1 < turnStarts.length ? turnStarts[t + 1]! : messages.length;
    let turnTokens = 0;
    for (let i = start; i < end; i++) turnTokens += estimateMessageTokens(messages[i]!);
    if (runningTokens + turnTokens > tailBudget) {
      // This turn doesn't fit entirely. Stop here.
      break;
    }
    runningTokens += turnTokens;
    chosen = start;
  }
  return { tailStartIndex: chosen, tailTokens: runningTokens };
}

/**
 * When even the most recent turn exceeds `tailBudget`, walk forward inside
 * that turn looking for the first sub-position (assistant/tool boundary)
 * whose suffix fits. Returns -1 if nothing fits.
 */
function findInsideTurnSplit(messages: ModelMessage[], turnStart: number, tailBudget: number): number {
  for (let start = turnStart + 1; start < messages.length; start++) {
    let size = 0;
    for (let i = start; i < messages.length; i++) size += estimateMessageTokens(messages[i]!);
    if (size <= tailBudget) return start;
  }
  return -1;
}

export function findCutPoint(messages: ModelMessage[], tailBudget: number): CutPointResult {
  if (messages.length === 0 || tailBudget <= 0) {
    return { tailStartIndex: messages.length, tailTokens: 0, splitInsideTurn: false };
  }
  const boundary = findTurnBoundaryCut(messages, tailBudget);
  if (boundary.tailStartIndex < messages.length) {
    return { ...boundary, splitInsideTurn: false };
  }
  // No turn fits — try splitting inside the most recent turn.
  const turnStarts = userTurnIndices(messages);
  const lastTurnStart = turnStarts.at(-1);
  if (lastTurnStart === undefined) {
    return { tailStartIndex: messages.length, tailTokens: 0, splitInsideTurn: false };
  }
  const splitAt = findInsideTurnSplit(messages, lastTurnStart, tailBudget);
  if (splitAt === -1) {
    // The single most recent message is already too large — keep only it
    // (caller decides whether to truncate).
    const onlyLast = messages.length - 1;
    return {
      tailStartIndex: onlyLast,
      tailTokens: estimateMessageTokens(messages[onlyLast]!),
      splitInsideTurn: true,
    };
  }
  let tailTokens = 0;
  for (let i = splitAt; i < messages.length; i++) tailTokens += estimateMessageTokens(messages[i]!);
  return { tailStartIndex: splitAt, tailTokens, splitInsideTurn: true };
}
