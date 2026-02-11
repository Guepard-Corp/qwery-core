import { z } from 'zod';

export const TemplateKindSchema = z.enum([
  'schema',
  'query',
  'notebook',
  'prompt',
  'dashboard',
  'app',
  'api',
  'report',
]);

export type TemplateKind = z.infer<typeof TemplateKindSchema>;

export const TemplateSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the template'),
  name: z.string().min(1).max(255).describe('The name of the template'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the template'),
  slug: z.string().min(1).describe('The slug of the template'),
  kind: z.enum(TemplateKindSchema.options).describe('The type of the template'),
  version: z.number().int().min(1).describe('The version of the template'),
  createdAt: z.date().describe('The date and time the template was created'),
  updatedAt: z
    .date()
    .describe('The date and time the template was last updated'),
  createdBy: z
    .string()
    .min(1)
    .max(255)
    .describe('The user who created the template'),
  updatedBy: z
    .string()
    .min(1)
    .max(255)
    .describe('The user who last updated the template'),
});

export type Template = z.infer<typeof TemplateSchema>;
