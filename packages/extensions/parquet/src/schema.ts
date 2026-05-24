import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extension-sdk';
import { z } from 'zod';

export const schema = z.object({
  source: z.string().min(1).max(DATASOURCE_INPUT_MAX_LENGTH.url).meta({
    label: 'Parquet source',
    description:
      'Local file path (absolute or relative to the working directory) OR an http(s):// URL. S3 and other remote stores require a dedicated extension.',
    placeholder: 'data/sales.parquet or https://example.com/data.parquet',
  }),
  viewName: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.name)
    .regex(/^[a-zA-Z_][\w]*$/, 'Must be a valid SQL identifier')
    .default('data')
    .meta({
      label: 'View name',
      description: 'DuckDB view name to expose this Parquet file under (default: "data").',
    }),
});

export type ParquetConfig = z.infer<typeof schema>;

const HTTP_PREFIX = /^https?:\/\//i;

export function isRemoteSource(source: string): boolean {
  return HTTP_PREFIX.test(source);
}
