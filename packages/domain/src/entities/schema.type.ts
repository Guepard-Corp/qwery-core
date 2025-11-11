import { z } from 'zod';

export const SchemaDefinition = z.object({
  id: z
    .string()
    .uuid()
    .optional()
    .describe('The unique identifier for the schema'),
  name: z.string().min(1).max(255).describe('The name of the schema'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the schema'),
  slug: z.string().min(1).describe('The slug of the schema'),
  createdAt: z
    .date()
    .optional()
    .describe('The date and time the schema was created'),
  updatedAt: z
    .date()
    .optional()
    .describe('The date and time the schema was last updated'),
  createdBy: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('The user who created the schema'),
  updatedBy: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('The user who last updated the schema'),
});

export type Schema = z.infer<typeof SchemaDefinition>;
