import { generateText, type LanguageModel, type ModelMessage } from 'ai';
import {
  COMPACTION_SYSTEM_PROMPT,
  FIRST_SUMMARY_USER_PROMPT,
  INCREMENTAL_SUMMARY_USER_PROMPT,
} from './prompts';
import { estimateTextTokens } from './tokens';

/**
 * LLM-driven summary phase. Serializes the head messages, sends them with the
 * structured prompt, returns the summary text. Supports incremental updates
 * (previous summary merged) like pi + opencode.
 *
 * Tool outputs longer than `toolOutputMaxChars` are truncated to keep the
 * summarizer itself from OOM-ing on a single huge result (opencode pattern).
 */

export const DEFAULT_TOOL_OUTPUT_MAX_CHARS = 2_000;
export const DEFAULT_SUMMARY_MAX_TOKENS = 1_200;

export type SummaryGenerator = (input: {
  system: string;
  messages: ModelMessage[];
  maxTokens: number;
  signal?: AbortSignal;
}) => Promise<{ text: string; tokens: { input: number; output: number } }>;

/** Default summary generator using the Vercel AI SDK's `generateText`. */
export function makeAiSdkSummaryGenerator(model: LanguageModel): SummaryGenerator {
  return async ({ system, messages, maxTokens, signal }) => {
    const result = await generateText({
      model,
      system,
      messages,
      maxOutputTokens: maxTokens,
      abortSignal: signal,
    });
    return {
      text: result.text,
      tokens: {
        input: result.usage.inputTokens ?? 0,
        output: result.usage.outputTokens ?? 0,
      },
    };
  };
}

function clipToolOutput(part: Record<string, unknown>, maxChars: number): Record<string, unknown> {
  const out = part.output;
  if (typeof out === 'string' && out.length > maxChars) {
    return { ...part, output: `${out.slice(0, maxChars)}… [truncated for summary]` };
  }
  if (typeof out === 'object' && out !== null) {
    const json = JSON.stringify(out);
    if (json.length > maxChars) {
      return { ...part, output: `${json.slice(0, maxChars)}… [truncated for summary]` };
    }
  }
  return part;
}

/** Trim tool outputs in a copy of the head so the summarizer stays small. */
export function clipToolOutputs(messages: ModelMessage[], maxChars: number): ModelMessage[] {
  return messages.map((msg) => {
    const content = (msg as { content?: unknown }).content;
    if (!Array.isArray(content)) return msg;
    const nextContent = content.map((p) => {
      const part = p as Record<string, unknown>;
      if (part.type === 'tool-result' || part.type === 'dynamic-tool-result') {
        return clipToolOutput(part, maxChars);
      }
      return part;
    });
    return { ...(msg as object), content: nextContent } as ModelMessage;
  });
}

export interface GenerateSummaryInput {
  /** Messages to summarize (the "head"). */
  head: ModelMessage[];
  /** Previous summary text to merge into, if any. */
  previousSummary?: string;
  /** Generator (LLM call). Injectable for tests. */
  generator: SummaryGenerator;
  /** Per-part output cap (default 2000 chars). */
  toolOutputMaxChars?: number;
  /** Cap on the summary tokens (default 1200). */
  maxSummaryTokens?: number;
  signal?: AbortSignal;
}

export interface GenerateSummaryResult {
  summary: string;
  /** Approximate token cost of the summary itself. */
  tokens: number;
  /** Provider-reported usage (input/output tokens consumed by the summarizer). */
  usage: { input: number; output: number };
}

export async function generateSummary(input: GenerateSummaryInput): Promise<GenerateSummaryResult> {
  const cap = input.toolOutputMaxChars ?? DEFAULT_TOOL_OUTPUT_MAX_CHARS;
  const maxTokens = input.maxSummaryTokens ?? DEFAULT_SUMMARY_MAX_TOKENS;
  const head = clipToolOutputs(input.head, cap);
  const userPrompt = input.previousSummary
    ? INCREMENTAL_SUMMARY_USER_PROMPT.replace('{{PREVIOUS_SUMMARY}}', input.previousSummary)
    : FIRST_SUMMARY_USER_PROMPT;
  const messages: ModelMessage[] = [...head, { role: 'user', content: userPrompt }];
  const { text, tokens } = await input.generator({
    system: COMPACTION_SYSTEM_PROMPT,
    messages,
    maxTokens,
    signal: input.signal,
  });
  return {
    summary: text.trim(),
    tokens: estimateTextTokens(text),
    usage: tokens,
  };
}
