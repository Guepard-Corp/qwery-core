import type { Model } from './provider';

import {
  DEFAULT_SYSTEM_PROMPT,
  SYSTEM_PROMPT_ANTHROPIC,
  SYSTEM_PROMPT_GEMINI,
  SYSTEM_PROMPT_OPENAI,
} from '../agents/prompts';

export type SystemContext = {
  cwd?: string;
  date?: string;
};

/**
 * Model-aware system prompt and optional environment context.
 * Selects provider-specific prompt by model id (OpenCode-style).
 */
export const SystemPrompt = {
  instructions(): string {
    return '';
  },

  provider(model: Model): string {
    const id = (model.api?.id ?? model.apiId ?? model.id).toLowerCase();
    if (id.includes('gpt-5') || id.includes('gpt-4'))
      return SYSTEM_PROMPT_OPENAI;
    if (id.includes('gpt-') || id.includes('o1') || id.includes('o3'))
      return SYSTEM_PROMPT_OPENAI;
    if (id.includes('gemini-')) return SYSTEM_PROMPT_GEMINI;
    if (id.includes('claude')) return SYSTEM_PROMPT_ANTHROPIC;
    return DEFAULT_SYSTEM_PROMPT;
  },

  async environment(model: Model, context?: SystemContext): Promise<string[]> {
    const date = context?.date ?? new Date().toDateString();
    const cwd =
      context?.cwd ??
      (typeof process !== 'undefined' ? process.cwd?.() : undefined);
    const lines = [`Model: ${model.providerID}/${model.id}`, `Date: ${date}`];
    if (cwd) lines.push(`Working directory: ${cwd}`);
    return [lines.join('\n')];
  },
};
