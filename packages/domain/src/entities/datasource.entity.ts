import { z } from 'zod';
import { generateIdentity } from '../utils/identity.generator';

export const DatasourceSchema = z.object({
  id: z.uuid().describe('The unique identifier for the datasource'),
  name: z.string().min(1).max(255).describe('The name of the datasource'),
  description: z.string().max(1024).default('').describe('The description of the datasource'),
  slug: z.string().min(1).describe('The slug of the datasource'),
  datasource_provider: z
    .string()
    .min(1)
    .describe('The provider of the datasource (e.g. mysql, postgres, csv)'),
  datasource_driver: z.string().describe('The driver of the datasource'),
  config: z.object({}).passthrough().describe('Provider-specific configuration (connection, file path, …)'),
  createdAt: z.date().describe('The date and time the datasource was created'),
  updatedAt: z.date().describe('The date and time the datasource was last updated'),
});

export type Datasource = z.infer<typeof DatasourceSchema>;

export const CreateDatasourceInputSchema = DatasourceSchema.pick({
  name: true,
  description: true,
  datasource_provider: true,
  datasource_driver: true,
  config: true,
}).partial({ description: true });
export type CreateDatasourceInput = z.infer<typeof CreateDatasourceInputSchema>;

export const UpdateDatasourceInputSchema = DatasourceSchema.pick({
  name: true,
  description: true,
  datasource_provider: true,
  datasource_driver: true,
  config: true,
}).partial();
export type UpdateDatasourceInput = z.infer<typeof UpdateDatasourceInputSchema>;

export const DatasourceOutputSchema = DatasourceSchema;
export type DatasourceOutput = z.infer<typeof DatasourceOutputSchema>;

export function createDatasource(input: CreateDatasourceInput): Datasource {
  const { id, slug } = generateIdentity();
  const now = new Date();
  return DatasourceSchema.parse({
    id,
    slug,
    name: input.name,
    description: input.description ?? '',
    datasource_provider: input.datasource_provider,
    datasource_driver: input.datasource_driver,
    config: input.config,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateDatasource(current: Datasource, input: UpdateDatasourceInput): Datasource {
  return DatasourceSchema.parse({
    ...current,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.datasource_provider !== undefined && { datasource_provider: input.datasource_provider }),
    ...(input.datasource_driver !== undefined && { datasource_driver: input.datasource_driver }),
    ...(input.config !== undefined && { config: input.config }),
    updatedAt: new Date(),
  });
}
