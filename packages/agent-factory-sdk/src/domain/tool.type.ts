import { z } from 'zod';

export type ToolInput = z.ZodTypeAny;

export type Tool<TName extends string, TInput extends ToolInput, TOutput> = {
  name: TName;
  description?: string;
  parameters?: TInput;
  handler: (input: z.infer<TInput>) => Promise<TOutput>;
};

export type ToolAny = Tool<string, ToolInput, unknown>;

export type ToolChoice = 'auto' | 'any' | (string & {});
