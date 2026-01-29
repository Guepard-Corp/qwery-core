import { z } from 'zod/v3';

const TypeZodSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    schema: z.string(),
    format: z.string(),
    enums: z.array(z.string()),
    attributes: z.array(
      z.object({
        name: z.string(),
        type_id: z.number(),
      }),
    ),
    comment: z.string().nullable(),
  })
  .passthrough();

export const TypeArrayZodSchema = z.array(TypeZodSchema);
export const TypeOptionalZodSchema = z.optional(TypeZodSchema);

export type Type = z.infer<typeof TypeZodSchema>;
export type TypeArray = z.infer<typeof TypeArrayZodSchema>;
export type TypeOptional = z.infer<typeof TypeOptionalZodSchema>;
