import { z } from 'zod';

export const PolicyZodSchema = z
  .object({
    id: z.number(),
    schema: z.string(),
    table: z.string(),
    table_id: z.number(),
    name: z.string(),
    action: z.union([z.literal('PERMISSIVE'), z.literal('RESTRICTIVE')]),
    roles: z.array(z.string()),
    command: z.union([
      z.literal('SELECT'),
      z.literal('INSERT'),
      z.literal('UPDATE'),
      z.literal('DELETE'),
      z.literal('ALL'),
    ]),
    definition: z.union([z.string(), z.null()]),
    check: z.union([z.string(), z.null()]),
  })
  .passthrough();
export const PolicyArrayZodSchema = z.array(PolicyZodSchema);
export const PolicyOptionalZodSchema = z.optional(PolicyZodSchema);

export type Policy = z.infer<typeof PolicyZodSchema>;
