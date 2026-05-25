import { DATASOURCE_INPUT_MAX_LENGTH as L } from '@qwery/extension-sdk';
import { z } from 'zod';

export const schema = z.object({
  database: z.string().min(1).max(L.connectionString).default(':memory:').meta({
    label: 'Database path',
    description: 'Path to a .duckdb / .db file, or :memory: for an empty in-memory database.',
    placeholder: 'path/to/analytics.duckdb',
  }),
});

export type DuckDbConfig = z.infer<typeof schema>;
