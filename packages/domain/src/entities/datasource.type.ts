import { z } from 'zod';

export enum DatasourceKind {
  EMBEDDED = 'embedded',
  REMOTE = 'remote',
}

export const DatasourceSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the datasource'),
  projectId: z
    .string()
    .uuid()
    .describe('The unique identifier for the project'),
  name: z.string().min(1).max(255).describe('The name of the datasource'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the datasource'),
  slug: z.string().min(1).describe('The slug of the datasource'),
  datasource_provider: z
    .string()
    .min(1)
    .describe('The provider of the datasource'),
  datasource_driver: z.string().describe('The driver of the datasource'),
  datasource_kind: z
    .nativeEnum(DatasourceKind)
    .describe('The kind of the datasource'),
  config: z.object({}).passthrough(),
  createdAt: z.date().describe('The date and time the datasource was created'),
  updatedAt: z
    .date()
    .describe('The date and time the datasource was last updated'),
  createdBy: z.string().describe('The user who created the datasource'),
  updatedBy: z.string().describe('The user who last updated the datasource'),
});

export type Datasource = z.infer<typeof DatasourceSchema>;
