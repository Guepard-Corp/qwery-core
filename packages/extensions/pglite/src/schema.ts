import { z } from 'zod';

export const schema = z.object({
  database: z
    .string()
    .default('playground')
    .meta({
      label: 'Database',
      description: 'Database name',
      placeholder: 'playground',
    }),
});

