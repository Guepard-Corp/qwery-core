import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extension-sdk';
import { z } from 'zod';

export const schema = z.object({
  url: z.string().min(1).max(DATASOURCE_INPUT_MAX_LENGTH.url).url().meta({
    label: 'CSV file URL',
    description:
      'Public http(s):// URL to a CSV file. Use the S3 extension for authenticated S3-compatible storage.',
    placeholder: 'https://example.com/data.csv',
  }),
  viewName: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.name)
    .regex(/^[a-zA-Z_][\w]*$/, 'Must be a valid SQL identifier')
    .default('data')
    .meta({
      label: 'View name',
      description: 'DuckDB view name to expose this CSV under (default: "data").',
    }),
});

export type CsvOnlineConfig = z.infer<typeof schema>;
