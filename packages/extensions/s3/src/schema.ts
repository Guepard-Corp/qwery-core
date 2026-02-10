import { z } from 'zod';

const providerEnum = z.enum(['aws', 'digitalocean', 'minio', 'other']);

const formatEnum = z.enum(['parquet', 'json']);

export const schema = z.object({
  provider: providerEnum,
  aws_access_key_id: z.string().min(1),
  aws_secret_access_key: z
    .string()
    .min(1)
    .meta({
      description: 'Secret access key',
      secret: true,
    }),
  aws_session_token: z.string().optional(),
  region: z.string().min(1),
  endpoint_url: z.string().url().optional(),
  bucket: z.string().min(1),
  prefix: z.string().default(''),
  format: formatEnum,
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
});

