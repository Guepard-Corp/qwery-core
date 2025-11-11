import { z } from 'zod';

import { DatasourceSchema } from './datasource.type';

export const PlaygroundSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the playground'),
  logo: z.string().describe('The logo of the playground'),
  name: z.string().min(1).max(255).describe('The name of the playground'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the playground'),
  datasource: DatasourceSchema.describe('The datasource for the playground'),
});

export type Playground = z.infer<typeof PlaygroundSchema>;
