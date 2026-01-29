import { z } from 'zod/v3';

const PublicationTableZodSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    schema: z.string(),
  })
  .passthrough();

export const PublicationZodSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    owner: z.string(),
    publish_insert: z.boolean(),
    publish_update: z.boolean(),
    publish_delete: z.boolean(),
    publish_truncate: z.boolean(),
    tables: z.array(PublicationTableZodSchema).nullable(),
  })
  .passthrough();

export const PublicationArrayZodSchema = z.array(PublicationZodSchema);
export const PublicationOptionalZodSchema = z.optional(PublicationZodSchema);

export type Publication = z.infer<typeof PublicationZodSchema>;
