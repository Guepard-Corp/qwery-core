import type { WithParts } from '../llm/message';

export type IsOverflowInput = {
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
  model?: unknown;
};

export async function isOverflow(_input: IsOverflowInput): Promise<boolean> {
  return false;
}

export async function prune(_input: {
  conversationSlug: string;
}): Promise<void> {}

export type ProcessInput = {
  parentID: string;
  messages: WithParts[];
  conversationSlug: string;
  abort: AbortSignal;
  auto: boolean;
};

export async function process(
  _input: ProcessInput,
): Promise<'stop' | 'continue'> {
  return 'continue';
}

export type CreateInput = {
  conversationSlug: string;
  agent: string;
  model: { providerID: string; modelID: string };
  auto: boolean;
};

export async function create(_input: CreateInput): Promise<void> {}

export const SessionCompaction = {
  isOverflow,
  prune,
  process,
  create,
};
