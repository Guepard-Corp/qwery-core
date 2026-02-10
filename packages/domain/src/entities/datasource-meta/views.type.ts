import { z } from 'zod';
import { ColumnArrayZodSchema } from './columns.type';

export const ViewZodSchema = z
  .object({
    id: z.number(),
    schema: z.string(),
    name: z.string(),
    is_updatable: z.boolean(),
    comment: z.string().nullable(),
    columns: ColumnArrayZodSchema.optional(),
  })
  .passthrough();

export type View = z.infer<typeof ViewZodSchema>;

export const ViewArrayZodSchema = z.array(ViewZodSchema);
export const ViewOptionalZodSchema = z.optional(ViewZodSchema);
