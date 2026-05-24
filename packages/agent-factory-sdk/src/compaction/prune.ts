import type { ModelMessage } from 'ai';
import { estimateTextTokens } from './tokens';

/**
 * Silent prune phase — walks backward through messages, protects the last
 * `protectedTurns` user turns plus up to `protectBudget` tokens of recent
 * tool outputs, then erases the `output` field of older tool-result parts
 * in-place (replacing with a marker string). No LLM call.
 *
 * Mirrors opencode's `prune()` and qwery-core's `prune()`. Idempotent: parts
 * already pruned are marked with `compactedAt` and not re-touched.
 *
 * Tools listed in `protectedTools` are NEVER pruned (their output is
 * instruction-like, not data — e.g. `skill`).
 */

export const PRUNE_MARKER = '[Tool output cleared by compaction]';
export const PRUNE_PROTECT_BUDGET = 40_000;
export const PRUNE_PROTECTED_TURNS = 2;
export const PRUNE_MIN_SAVING = 20_000;
export const DEFAULT_PROTECTED_TOOLS: readonly string[] = ['skill'];

export interface PruneOptions {
  /** Number of recent user turns to fully protect (default 2). */
  protectedTurns?: number;
  /** Token budget of recent tool outputs to protect (default 40k). */
  protectBudget?: number;
  /** Don't bother pruning if we'd save less than this (default 20k). */
  minSaving?: number;
  /** Tool names whose output is never pruned (default `['skill']`). */
  protectedTools?: readonly string[];
}

export interface PruneResult {
  messages: ModelMessage[];
  prunedTokens: number;
  prunedParts: number;
  skipped: boolean;
  reason?: string;
}

interface ToolPart {
  message: ModelMessage;
  messageIndex: number;
  partIndex: number;
  toolName: string;
  output: unknown;
  tokens: number;
  alreadyCompacted: boolean;
}

function extractToolName(part: Record<string, unknown>): string {
  const direct = part.toolName ?? part.tool;
  if (typeof direct === 'string') return direct;
  if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
    return part.type.slice('tool-'.length);
  }
  return '';
}

function isToolResultPart(part: Record<string, unknown>): boolean {
  return part.type === 'tool-result' || part.type === 'dynamic-tool-result';
}

function partTokens(output: unknown): number {
  if (output === undefined || output === null) return 0;
  if (typeof output === 'string') return estimateTextTokens(output);
  return estimateTextTokens(JSON.stringify(output));
}

function isAlreadyCompacted(part: Record<string, unknown>): boolean {
  if (part.compactedAt !== undefined) return true;
  if (part.output === PRUNE_MARKER) return true;
  return false;
}

/**
 * Walk backward, identify the set of tool-result parts that may be pruned,
 * EXCEPT the most recent ones that fit under `protectBudget` AND any part
 * inside the last `protectedTurns` user turns AND any protected tool name.
 */
function collectToPrune(
  messages: ModelMessage[],
  opts: Required<PruneOptions>,
): { toPrune: ToolPart[]; estimate: number } {
  let userTurnsSeen = 0;
  let protectedTokens = 0;
  const toPrune: ToolPart[] = [];

  for (let mi = messages.length - 1; mi >= 0; mi--) {
    const msg = messages[mi]!;
    if (msg.role === 'user') {
      userTurnsSeen++;
      continue;
    }
    if (msg.role !== 'tool' && msg.role !== 'assistant') continue;
    const content = (msg as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (let pi = content.length - 1; pi >= 0; pi--) {
      const part = content[pi] as Record<string, unknown>;
      if (!isToolResultPart(part)) continue;
      const toolName = extractToolName(part);
      if (opts.protectedTools.includes(toolName)) continue;
      const compacted = isAlreadyCompacted(part);
      const tokens = partTokens(part.output);
      // Inside the last `protectedTurns` we don't touch anything.
      if (userTurnsSeen < opts.protectedTurns) {
        protectedTokens += tokens;
        continue;
      }
      // Already compacted — count toward the budget but don't re-prune.
      if (compacted) continue;
      // Protect recent tool outputs up to `protectBudget`.
      if (protectedTokens < opts.protectBudget) {
        protectedTokens += tokens;
        continue;
      }
      toPrune.push({
        message: msg,
        messageIndex: mi,
        partIndex: pi,
        toolName,
        output: part.output,
        tokens,
        alreadyCompacted: compacted,
      });
    }
  }
  const estimate = toPrune.reduce((acc, p) => acc + p.tokens, 0);
  return { toPrune, estimate };
}

/**
 * Apply the prune in-place by cloning the affected messages (returning a new
 * array — caller decides whether to persist). Original messages are NOT
 * mutated, keeping the function pure & safe for retry on persistence error.
 */
export function prune(messages: ModelMessage[], options: PruneOptions = {}): PruneResult {
  const opts: Required<PruneOptions> = {
    protectedTurns: options.protectedTurns ?? PRUNE_PROTECTED_TURNS,
    protectBudget: options.protectBudget ?? PRUNE_PROTECT_BUDGET,
    minSaving: options.minSaving ?? PRUNE_MIN_SAVING,
    protectedTools: options.protectedTools ?? DEFAULT_PROTECTED_TOOLS,
  };
  if (messages.length === 0) {
    return { messages, prunedTokens: 0, prunedParts: 0, skipped: true, reason: 'empty' };
  }
  const { toPrune, estimate } = collectToPrune(messages, opts);
  if (estimate < opts.minSaving) {
    return {
      messages,
      prunedTokens: estimate,
      prunedParts: toPrune.length,
      skipped: true,
      reason: `would save ${estimate}t < ${opts.minSaving}t minimum`,
    };
  }
  const now = Date.now();
  // Build a Map<messageIndex, Set<partIndex>> to rewrite efficiently.
  const planByMessage = new Map<number, Set<number>>();
  for (const p of toPrune) {
    let set = planByMessage.get(p.messageIndex);
    if (!set) {
      set = new Set();
      planByMessage.set(p.messageIndex, set);
    }
    set.add(p.partIndex);
  }
  const next = messages.map((msg, mi) => {
    const plan = planByMessage.get(mi);
    if (!plan) return msg;
    const content = (msg as { content?: unknown }).content;
    if (!Array.isArray(content)) return msg;
    const nextContent = content.map((part, pi) => {
      if (!plan.has(pi)) return part;
      const p = part as Record<string, unknown>;
      return { ...p, output: PRUNE_MARKER, compactedAt: now };
    });
    return { ...(msg as object), content: nextContent } as ModelMessage;
  });
  return { messages: next, prunedTokens: estimate, prunedParts: toPrune.length, skipped: false };
}
