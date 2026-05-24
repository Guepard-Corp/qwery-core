import type { ModelMessage } from 'ai';
import { findCutPoint } from './cut-point';
import {
  DEFAULT_PRESERVE_TAIL_FRACTION,
  DEFAULT_PRESERVE_TAIL_MAX,
  DEFAULT_PRESERVE_TAIL_MIN,
  DEFAULT_RESERVED_OUTPUT,
  isOverflow,
  preserveTailBudget,
  usable,
} from './overflow';
import { PRUNE_MIN_SAVING, PRUNE_PROTECT_BUDGET, PRUNE_PROTECTED_TURNS, prune } from './prune';
import { generateSummary, type SummaryGenerator } from './summary';

/**
 * Compaction orchestrator. Combines the prune + summary phases into a single
 * decision point the agent loop can call before each turn.
 *
 * Strategy (best of opencode + pi):
 *   1. Estimate the prompt size from the last assistant usage (or fall back
 *      to char-based estimation if no usage available).
 *   2. If not overflowing and `auto: true` (precautionary), return as-is.
 *   3. Try pruning first (silent, no LLM): clears old tool outputs in place.
 *      Often enough by itself to push the prompt back below the threshold.
 *   4. If still overflowing (or `force: true`), find a head/tail cut and run
 *      the LLM summarizer over the head.
 *   5. Return the new messages: [summary marker, ...tail].
 */

export interface RunCompactionInput {
  messages: ModelMessage[];
  /** Token count from the last assistant usage (or chars/4 fallback). */
  promptTokens: number;
  /** Hard model context window (e.g. 200_000). */
  contextLimit: number;
  /** Optional: previous summary to merge with the new head. */
  previousSummary?: string;
  /** Forces compaction even when not overflowing. */
  force?: boolean;
  /** When true, only check overflow (skip the precautionary trigger). */
  onOverflowOnly?: boolean;
  /** Reserved output budget (default 20k). */
  reserved?: number;
  /** Tail preserve fraction (default 25%). */
  preserveTailFraction?: number;
  preserveTailMin?: number;
  preserveTailMax?: number;
  /** Prune knobs. */
  protectedTurns?: number;
  protectBudget?: number;
  pruneMinSaving?: number;
  protectedTools?: readonly string[];
  /** LLM call. Injectable for tests. */
  summaryGenerator?: SummaryGenerator;
  toolOutputMaxChars?: number;
  maxSummaryTokens?: number;
  signal?: AbortSignal;
}

export type CompactionPhase = 'none' | 'prune-only' | 'prune-and-summary' | 'summary-only';

export interface CompactionResult {
  messages: ModelMessage[];
  /** What actually happened (helps for logging + tests). */
  phase: CompactionPhase;
  prunedTokens: number;
  prunedParts: number;
  summary?: string;
  /** Tokens saved overall (rough estimate). */
  savedTokens: number;
  /** The cut index used (0 means everything was summarized). */
  tailStartIndex: number;
  splitInsideTurn: boolean;
  /** True when the most recent user message had to be re-injected. */
  replayedUserMessage: boolean;
}

/**
 * If the tail starts with a user message, no replay needed (the user's last
 * ask is already preserved). Otherwise, scan backward for the most recent
 * user message inside the head and return it for re-injection after the
 * summary. Returns null if nothing to replay.
 */
function findReplayUserMessage(messages: ModelMessage[], tailStartIndex: number): ModelMessage | null {
  if (tailStartIndex >= messages.length) return null;
  if (messages[tailStartIndex]?.role === 'user') return null;
  for (let i = tailStartIndex - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') return messages[i]!;
  }
  return null;
}

function buildSummaryMessage(summary: string): ModelMessage {
  // Use a synthetic user message so the summary is positioned at the head of
  // the context unambiguously. The agent loop will detect it via the marker.
  return {
    role: 'user',
    content: `<conversation_summary generated="compaction">\n${summary}\n</conversation_summary>`,
  };
}

export const SUMMARY_MARKER_OPEN = '<conversation_summary';
export const SUMMARY_MARKER_CLOSE = '</conversation_summary>';

export async function runCompaction(input: RunCompactionInput): Promise<CompactionResult> {
  const overflow = isOverflow({
    promptTokens: input.promptTokens,
    contextLimit: input.contextLimit,
    reserved: input.reserved,
  });
  if (!overflow && !input.force) {
    return {
      messages: input.messages,
      phase: 'none',
      prunedTokens: 0,
      prunedParts: 0,
      savedTokens: 0,
      tailStartIndex: input.messages.length,
      splitInsideTurn: false,
      replayedUserMessage: false,
    };
  }

  // Phase 1: prune (silent).
  const pruneResult = prune(input.messages, {
    protectedTurns: input.protectedTurns ?? PRUNE_PROTECTED_TURNS,
    protectBudget: input.protectBudget ?? PRUNE_PROTECT_BUDGET,
    minSaving: input.pruneMinSaving ?? PRUNE_MIN_SAVING,
    protectedTools: input.protectedTools,
  });

  // Re-check overflow after prune (rough — we subtract pruned tokens).
  const afterPruneTokens = Math.max(0, input.promptTokens - pruneResult.prunedTokens);
  const stillOverflow = isOverflow({
    promptTokens: afterPruneTokens,
    contextLimit: input.contextLimit,
    reserved: input.reserved,
  });
  if (!stillOverflow && !input.force) {
    return {
      messages: pruneResult.messages,
      phase: pruneResult.skipped ? 'none' : 'prune-only',
      prunedTokens: pruneResult.prunedTokens,
      prunedParts: pruneResult.prunedParts,
      savedTokens: pruneResult.prunedTokens,
      tailStartIndex: pruneResult.messages.length,
      splitInsideTurn: false,
      replayedUserMessage: false,
    };
  }

  // Phase 2: summary. Pick a head/tail split, generate.
  if (!input.summaryGenerator) {
    throw new Error('runCompaction: still overflowing after prune but no summaryGenerator provided.');
  }
  const tailBudget = preserveTailBudget({
    contextLimit: input.contextLimit,
    reserved: input.reserved,
    fraction: input.preserveTailFraction ?? DEFAULT_PRESERVE_TAIL_FRACTION,
    minTokens: input.preserveTailMin ?? DEFAULT_PRESERVE_TAIL_MIN,
    maxTokens: input.preserveTailMax ?? DEFAULT_PRESERVE_TAIL_MAX,
  });
  const cut = findCutPoint(pruneResult.messages, tailBudget);
  const head = pruneResult.messages.slice(0, cut.tailStartIndex);
  const tail = pruneResult.messages.slice(cut.tailStartIndex);

  if (head.length === 0) {
    // Nothing to summarize beyond what was pruned.
    return {
      messages: pruneResult.messages,
      phase: pruneResult.prunedTokens > 0 ? 'prune-only' : 'none',
      prunedTokens: pruneResult.prunedTokens,
      prunedParts: pruneResult.prunedParts,
      savedTokens: pruneResult.prunedTokens,
      tailStartIndex: cut.tailStartIndex,
      splitInsideTurn: cut.splitInsideTurn,
      replayedUserMessage: false,
    };
  }

  const summaryResult = await generateSummary({
    head,
    previousSummary: input.previousSummary,
    generator: input.summaryGenerator,
    toolOutputMaxChars: input.toolOutputMaxChars,
    maxSummaryTokens: input.maxSummaryTokens,
    signal: input.signal,
  });

  // Replay user intent: when the cut placed the most recent user message in
  // the head (so it would be summarized away), re-inject it right after the
  // summary so the agent still sees what the user just asked for.
  const replay = findReplayUserMessage(pruneResult.messages, cut.tailStartIndex);
  const summaryMsg = buildSummaryMessage(summaryResult.summary);
  const nextMessages: ModelMessage[] = replay ? [summaryMsg, replay, ...tail] : [summaryMsg, ...tail];

  return {
    messages: nextMessages,
    phase: pruneResult.prunedTokens > 0 ? 'prune-and-summary' : 'summary-only',
    prunedTokens: pruneResult.prunedTokens,
    prunedParts: pruneResult.prunedParts,
    summary: summaryResult.summary,
    savedTokens: pruneResult.prunedTokens + Math.max(0, head.length * 100 - summaryResult.tokens),
    tailStartIndex: cut.tailStartIndex,
    splitInsideTurn: cut.splitInsideTurn,
    replayedUserMessage: replay !== null,
  };
}

export { DEFAULT_RESERVED_OUTPUT, isOverflow, preserveTailBudget, usable };
