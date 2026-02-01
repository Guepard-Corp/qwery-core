import { z } from 'zod/v3';
import type { WithParts } from '../llm/message';

export type Model = { providerId: string; modelId: string };

export type AskRequest = {
  permission: string;
  patterns: string[];
  always?: string[];
  metadata?: Record<string, unknown>;
};

export type ToolMetadataInput = {
  title?: string;
  metadata?: Record<string, unknown>;
};

export type ToolContext = {
  conversationId: string;
  agentId: string;
  messageId?: string;
  callId?: string;
  abort: AbortSignal;
  extra?: Record<string, unknown>;
  messages: WithParts[];
  ask(req: AskRequest): Promise<void>;
  metadata(input: ToolMetadataInput): void | Promise<void>;
};

export type ToolResult = { output: string } | string | Record<string, unknown>;

export type ToolExecute<Params extends z.ZodType> = (
  args: z.infer<Params>,
  ctx: ToolContext,
) => Promise<ToolResult>;

export type ToolConfigSync<Params extends z.ZodType> = {
  description: string;
  parameters: Params;
  execute: ToolExecute<Params>;
  whenModel?: (model: Model) => boolean;
};

export type ToolInitResult<Params extends z.ZodType> = {
  description: string;
  parameters: Params;
  execute: ToolExecute<Params>;
};

export type ToolConfigAsync<Params extends z.ZodType> = {
  whenModel?: (model: Model) => boolean;
  init: (ctx?: { agent?: { id: string } }) => Promise<ToolInitResult<Params>>;
};

export type ToolInfo<Params extends z.ZodType = z.ZodType> =
  | (ToolConfigSync<Params> & { id: string })
  | ({ id: string } & ToolConfigAsync<Params>);

export type InferParams<T extends ToolInfo> =
  T extends ToolInfo<infer P> ? z.infer<P> : never;

export type InferResult<T extends ToolInfo> = T extends {
  execute: (args: unknown, ctx: ToolContext) => Promise<infer R>;
}
  ? R
  : never;

function isAsyncTool<Params extends z.ZodType>(
  config: ToolConfigSync<Params> | ToolConfigAsync<Params>,
): config is ToolConfigAsync<Params> {
  return 'init' in config && typeof config.init === 'function';
}

export const Tool = {
  define<Params extends z.ZodType>(
    id: string,
    config: ToolConfigSync<Params> | ToolConfigAsync<Params>,
  ): ToolInfo<Params> {
    return { id, ...config } as ToolInfo<Params>;
  },
  isAsync: isAsyncTool,
};
