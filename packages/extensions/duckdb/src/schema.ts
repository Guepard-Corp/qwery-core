import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

export const schema = z.object({
  database: z
    .string()
    .max(DATASOURCE_INPUT_MAX_LENGTH.connectionString)
    .default(':memory:')
    .meta({
      label: 'Database',
      description: 'Database path (use :memory: for in-memory database)',
      placeholder: ':memory: or path/to/file.duckdb',
    }),
});

