import { z } from 'zod/v3';

const ColumnZodSchema = z
  .object({
    id: z.string(),
    table_id: z.number(),
    schema: z.string(),
    table: z.string(),
    name: z.string(),
    ordinal_position: z.number(),
    data_type: z.string(),
    format: z.string(),
    is_identity: z.boolean(),
    identity_generation: z.string().nullable(),
    is_generated: z.boolean(),
    is_nullable: z.boolean(),
    is_updatable: z.boolean(),
    is_unique: z.boolean(),
    check: z.string().nullable(),
    default_value: z.any().nullable(),
    enums: z.array(z.string()),
    comment: z.string().nullable(),
  })
  .passthrough();

export const ColumnArrayZodSchema = z.array(ColumnZodSchema);

export type Column = z.infer<typeof ColumnZodSchema>;
