import { z } from 'zod';

export const TriggerZodSchema = z
  .object({
    id: z.number(),
    table_id: z.number(),
    name: z.string(),
    table: z.string(),
    schema: z.string(),
    events: z.array(z.string()),
    function_name: z.string(),
    function_schema: z.string().optional(),
    condition: z.string().nullable().optional(),
    timing: z.string().optional(),
    orientation: z.string().optional(),
    function_args: z.array(z.string()).optional(),
  })
  .passthrough();

export type Trigger = z.infer<typeof TriggerZodSchema>;

export const TriggerArrayZodSchema = z.array(TriggerZodSchema);
export const TriggerOptionalZodSchema = z.optional(TriggerZodSchema);
