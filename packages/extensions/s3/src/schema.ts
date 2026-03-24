import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

const providerEnum = z.enum(['aws', 'digitalocean', 'minio', 'other']);

const formatEnum = z.enum(['parquet', 'json']);

const pattern = z
  .string()
  .max(DATASOURCE_INPUT_MAX_LENGTH.patternList);

export const schema = z.object({
  provider: providerEnum,
  aws_access_key_id: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.accessKeyId),
  aws_secret_access_key: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.secretAccessKey)
    .meta({
      description: 'Secret access key',
      secret: true,
    }),
  aws_session_token: z
    .string()
    .max(DATASOURCE_INPUT_MAX_LENGTH.sessionToken)
    .optional(),
  region: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.region),
  endpoint_url: z
    .string()
    .max(DATASOURCE_INPUT_MAX_LENGTH.endpointUrl)
    .url()
    .optional(),
  bucket: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.bucket),
  prefix: z
    .string()
    .max(DATASOURCE_INPUT_MAX_LENGTH.prefix)
    .default(''),
  format: formatEnum,
  includes: z.array(pattern).optional(),
  excludes: z.array(pattern).optional(),
});

