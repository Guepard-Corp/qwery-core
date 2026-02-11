import { z } from 'zod';

export const schema = z.object({
  database: z
    .string()
    .default(':memory:')
    .meta({
      label: 'Database',
      description: 'Database path (use :memory: for in-memory database)',
      placeholder: ':memory: or path/to/file.duckdb',
    }),
});

