import { z } from 'zod';

/** Valid export filename: lowercase, letters/numbers/hyphens/underscores only, 1–50 chars. */
export const ExportFilenameSchema = z
  .string()
  .min(1, 'exportFilename cannot be empty')
  .max(50)
  .regex(/^[a-z0-9_-]+$/, {
    message:
      'exportFilename must be lowercase letters, numbers, hyphens, or underscores only',
  })
  .optional();

export type ExportFilename = z.infer<typeof ExportFilenameSchema>;

/**
 * Schema for runQuery tool result (Tool Calling with Structured Output).
 * AI SDK 6: structure is enforced at the tool level—the LLM provides exportFilename
 * in the same tool call as the SQL; we echo it in the result.
 */
export const RunQueryResultSchema = z.object({
  result: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
  sqlQuery: z.string(),
  executed: z.boolean(),
  exportFilename: ExportFilenameSchema,
});

export type RunQueryResult = z.infer<typeof RunQueryResultSchema>;
