import { z } from 'zod/v3';

const IndexZodSchema = z
  .object({
    id: z.number(),
    table_id: z.number(),
    schema: z.string(),
    name: z.string().optional(),
    is_unique: z.boolean(),
    is_primary: z.boolean(),
    index_definition: z.string(),
    access_method: z.string(),
    columns: z.array(z.string()).optional(),
    comment: z.string().nullable(),
    index_attributes: z
      .array(
        z.object({
          attribute_number: z.number().optional(),
          attribute_name: z.string(),
          data_type: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

export const IndexArrayZodSchema = z.array(IndexZodSchema);
export const IndexOptionalZodSchema = z.optional(IndexZodSchema);

export type Index = z.infer<typeof IndexZodSchema>;
export type IndexArray = z.infer<typeof IndexArrayZodSchema>;
export type IndexOptional = z.infer<typeof IndexOptionalZodSchema>;
