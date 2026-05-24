import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const UsageSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid().optional().describe('The session this usage record belongs to'),
  messageId: z.uuid().optional().describe('The message this usage record corresponds to, when applicable'),
  model: z.string().describe('Provider model identifier (e.g. "openai/gpt-4o", "azure/gpt-5.3-codex")'),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  totalTokens: z.number().int().nonnegative().default(0),
  reasoningTokens: z.number().int().nonnegative().default(0),
  cachedInputTokens: z.number().int().nonnegative().default(0),
  cacheWriteTokens: z.number().int().nonnegative().default(0),
  // Cost columns are computed via `computeUsageCost` from a models.dev catalog.
  costUSD: z.number().nonnegative().default(0).describe('Total cost in USD for this usage record'),
  inputCostUSD: z.number().nonnegative().default(0),
  outputCostUSD: z.number().nonnegative().default(0),
  durationMs: z.number().int().nonnegative().default(0).describe('Wall-clock duration in ms'),
  contextSize: z.number().int().nonnegative().default(0),
  timestamp: z.date(),
});

export type Usage = z.infer<typeof UsageSchema>;

export const CreateUsageInputSchema = UsageSchema.omit({ id: true, timestamp: true }).extend({
  timestamp: z.date().optional(),
});
export type CreateUsageInput = z.infer<typeof CreateUsageInputSchema>;

export const UsageOutputSchema = UsageSchema;
export type UsageOutput = z.infer<typeof UsageOutputSchema>;

export function createUsage(input: CreateUsageInput): Usage {
  return UsageSchema.parse({
    id: uuidv4(),
    ...input,
    timestamp: input.timestamp ?? new Date(),
  });
}
