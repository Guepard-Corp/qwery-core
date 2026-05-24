import { DATASOURCE_INPUT_MAX_LENGTH as L } from '@qwery/extension-sdk';
import { z } from 'zod';

export const schema = z.object({
  provider: z.enum(['aws', 'digitalocean', 'minio', 'other']).default('aws').meta({
    label: 'Provider',
    description: 'S3-compatible storage provider (aws, digitalocean, minio, other).',
  }),
  aws_access_key_id: z.string().min(1).max(L.accessKeyId).meta({ label: 'Access key ID' }),
  aws_secret_access_key: z
    .string()
    .min(1)
    .max(L.secretAccessKey)
    .meta({ label: 'Secret access key', secret: true }),
  aws_session_token: z
    .string()
    .max(L.sessionToken)
    .optional()
    .meta({ label: 'Session token (optional)', secret: true }),
  region: z.string().min(1).max(L.region).default('us-east-1').meta({ label: 'Region' }),
  endpoint_url: z.string().max(L.endpointUrl).url().optional().meta({
    label: 'Endpoint URL (non-AWS)',
    description: 'Required for MinIO/other; optional for AWS and DigitalOcean.',
    placeholder: 'https://nyc3.digitaloceanspaces.com',
  }),
  bucket: z.string().min(1).max(L.bucket).meta({ label: 'Bucket' }),
  prefix: z
    .string()
    .max(L.prefix)
    .default('')
    .meta({ label: 'Prefix', description: 'Key prefix within the bucket (optional).' }),
  format: z.enum(['parquet', 'json']).default('parquet').meta({ label: 'File format' }),
  includes: z.array(z.string().max(L.patternList)).optional(),
  excludes: z.array(z.string().max(L.patternList)).optional(),
});

export type S3Config = z.infer<typeof schema>;
