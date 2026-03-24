import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

export const schema = z.object({
  url: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.url)
    .url()
    .meta({
      label: 'Parquet file URL',
      description: 'Public URL to a Parquet file (http:// or https://). Use S3 extension to connect to S3-compatible storage that needs authentication.',
      placeholder: 'https://example.com/data.parquet',
    }),
});