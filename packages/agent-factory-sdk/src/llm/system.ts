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
  isGitRepo?: boolean;
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
    const modelId = model.api?.id ?? model.id;
    const date = context?.date ?? new Date().toDateString();
    const cwd =
      context?.cwd ??
      (typeof process !== 'undefined' ? process.cwd?.() : undefined);
    const platform =
      typeof process !== 'undefined' ? process.platform : undefined;
    const isGitRepo = context?.isGitRepo;

    const envLines = [
      `You are powered by the model named ${modelId}. The exact model ID is ${model.providerID}/${modelId}`,
      `Here is some useful information about the environment you are running in:`,
      `<env>`,
      ...(cwd ? [`  Working directory: ${cwd}`] : []),
      ...(isGitRepo !== undefined
        ? [`  Is directory a git repo: ${isGitRepo ? 'yes' : 'no'}`]
        : []),
      ...(platform ? [`  Platform: ${platform}`] : []),
      `  Today's date: ${date}`,
      `</env>`,
    ];
    return [envLines.join('\n')];
  },
};
