import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

const passwordField = z
  .string()
  .min(1)
  .max(DATASOURCE_INPUT_MAX_LENGTH.password)
  .describe('secret:true')
  .meta({
    description: 'Database password',
    secret: true,
  });

const connectionUrlField = z
  .string()
  .min(1)
  .max(DATASOURCE_INPUT_MAX_LENGTH.connectionString)
  .url()
  .describe('secret:true')
  .meta({
    description:
      'PostgreSQL connection string (postgresql://user:pass@host:port/db)',
    placeholder: 'postgresql://user:pass@host:5432/db',
    secret: true,
  });

const detailsSchema = z.object({
  host: z
    .string()
    .min(1)
    .meta({
      label: 'Host',
      description: 'Database server hostname',
    }),
  port: z
    .coerce.number()
    .int()
    .min(1)
    .max(65535)
    .default(5432)
    .meta({
      label: 'Port',
      placeholder: '5432',
    }),
  username: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.username)
    .meta({
      label: 'Username',
      description: 'Database user',
    }),
  user: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.username)
    .optional()
    .meta({
      label: 'User (alias for username)',
    }),
  password: passwordField,
  database: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.database)
    .meta({
      label: 'Database',
      description: 'Database name',
    }),
  sslmode: z
    .enum(['disable', 'require', 'prefer', 'verify-ca', 'verify-full'])
    .default('prefer')
    .meta({
      label: 'SSL mode',
    }),
});

/** URL mode: either `connectionUrl` or legacy `connectionString` (same validation). */
const urlSchema = z
  .object({
    connectionUrl: connectionUrlField.optional(),
    connectionString: connectionUrlField.optional(),
  })
  .refine(
    (v) =>
      (typeof v.connectionUrl === 'string' && v.connectionUrl.length > 0) ||
      (typeof v.connectionString === 'string' && v.connectionString.length > 0),
    { message: 'connectionUrl or connectionString is required' },
  )
  .transform((v) => ({
    connectionUrl: (v.connectionUrl ?? v.connectionString) as string,
  }));

export const schema = z.union([detailsSchema, urlSchema]);

