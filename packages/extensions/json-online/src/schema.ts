import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

const urlField = z
  .string()
  .min(1)
  .max(DATASOURCE_INPUT_MAX_LENGTH.url)
  .url()
  .meta({
    label: 'JSON file URL. Use S3 extension for authenticated S3-compatible storage.',
    placeholder: 'https://example.com/data.json',
  });

export const schema = z
  .object({
    url: z.string().optional(),
    jsonUrl: z.string().optional(),
    connectionUrl: z.string().optional(),
    connectionString: z.string().optional(),
  })
  .passthrough()
  .transform((c) => {
    const raw =
      c.url ??
      c.jsonUrl ??
      c.connectionUrl ??
      c.connectionString;
    return { url: raw };
  })
  .pipe(z.object({ url: urlField }));
