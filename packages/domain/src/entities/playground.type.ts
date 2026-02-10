import { z } from 'zod';

import { DatasourceSchema, DatasourceKind } from './datasource.type';

export const PlaygroundDatasourceSchema = DatasourceSchema.omit({
  id: true,
  projectId: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isPublic: true,
  remixedFrom: true,
}).extend({
  datasource_kind: z
    .nativeEnum(DatasourceKind)
    .describe('The kind of the datasource'),
});

export const PlaygroundSchema = z.object({
  id: z.string().describe('The unique identifier for the playground'),
  logo: z.string().describe('The logo of the playground'),
  name: z.string().min(1).max(255).describe('The name of the playground'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the playground'),
  datasource: PlaygroundDatasourceSchema.describe(
    'The datasource template for the playground',
  ),
});

export type Playground = z.infer<typeof PlaygroundSchema>;
