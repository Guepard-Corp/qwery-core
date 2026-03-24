import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

export const schema = z.object({
  database: z
    .string()
    .max(DATASOURCE_INPUT_MAX_LENGTH.database)
    .default('playground')
    .meta({
      label: 'Database',
      description: 'Database name',
      placeholder: 'playground',
    }),
});

