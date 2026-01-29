import { z } from 'zod/v3';

export type Tool<TName extends string, TInput extends ToolInput, TOutput> = {
  name: TName;
  description?: string;
  parameters?: TInput;
  handler: (input: z.infer<TInput>) => Promise<TOutput>;
};

export type ToolAny = Tool<string, ToolInput, unknown>;

export type ToolInput = z.ZodTypeAny;

export type ToolChoice = 'auto' | 'any' | (string & {});
