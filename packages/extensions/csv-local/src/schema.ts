import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extension-sdk';
import { z } from 'zod';

export const schema = z.object({
  path: z.string().min(1).max(DATASOURCE_INPUT_MAX_LENGTH.url).meta({
    label: 'CSV file path',
    description: 'Absolute or relative path to a local CSV file (resolved against the working directory).',
    placeholder: 'data/sales.csv',
  }),
  viewName: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.name)
    .regex(/^[a-zA-Z_][\w]*$/, 'Must be a valid SQL identifier')
    .default('data')
    .meta({
      label: 'View name',
      description: 'The DuckDB view name to expose this CSV under (default: "data").',
    }),
});

export type CsvLocalConfig = z.infer<typeof schema>;
