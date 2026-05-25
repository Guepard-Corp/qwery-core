import { z } from 'zod';

export const SchemaZod = z
  .object({
    id: z.number(),
    name: z.string(),
    owner: z.string(),
  })
  .passthrough();
export const SchemaArrayZod = z.array(SchemaZod);
export const SchemaOptionalZod = z.optional(SchemaZod);

export type Schema = z.infer<typeof SchemaZod>;
export type SchemaArray = z.infer<typeof SchemaArrayZod>;
export type SchemaOptional = z.infer<typeof SchemaOptionalZod>;
