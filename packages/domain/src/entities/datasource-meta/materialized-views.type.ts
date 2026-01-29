import { z } from 'zod/v3';
import { ColumnArrayZodSchema } from './columns.type';

export const MaterializedViewZodSchema = z
  .object({
    id: z.number(),
    schema: z.string(),
    name: z.string(),
    is_populated: z.boolean(),
    comment: z.string().nullable(),
    columns: ColumnArrayZodSchema.optional(),
  })
  .passthrough();

export type MaterializedView = z.infer<typeof MaterializedViewZodSchema>;

export const MaterializedViewArrayZodSchema = z.array(
  MaterializedViewZodSchema,
);
export const MaterializedViewOptionalZodSchema = z.optional(
  MaterializedViewZodSchema,
);
