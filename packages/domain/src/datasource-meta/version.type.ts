import { z } from 'zod';

export const DatasourceVersionZodSchema = z.object({
  version: z.string(),
  version_number: z.number(),
  active_connections: z.number(),
  max_connections: z.number(),
});

export type DatasourceVersion = z.infer<typeof DatasourceVersionZodSchema>;
