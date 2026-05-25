import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extension-sdk';
import { z } from 'zod';

const passwordField = z
  .string()
  .min(1)
  .max(DATASOURCE_INPUT_MAX_LENGTH.password)
  .describe('secret:true')
  .meta({
    label: 'Password',
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
    label: 'Connection URL',
    description: 'PostgreSQL connection string (postgresql://user:pass@host:port/db)',
    placeholder: 'postgresql://user:pass@host:5432/db',
    secret: true,
  });

/** Connection-by-fields mode. */
const detailsSchema = z
  .object({
    host: z.string().min(1).meta({
      label: 'Host',
      description: 'Database server hostname',
    }),
    port: z.coerce.number().int().min(1).max(65535).default(5432).meta({
      label: 'Port',
      placeholder: '5432',
    }),
    username: z.string().min(1).max(DATASOURCE_INPUT_MAX_LENGTH.username).meta({
      label: 'Username',
      description: 'Database user',
    }),
    password: passwordField,
    database: z.string().min(1).max(DATASOURCE_INPUT_MAX_LENGTH.database).meta({
      label: 'Database',
      description: 'Database name',
    }),
    sslmode: z
      .enum(['disable', 'require', 'prefer', 'verify-ca', 'verify-full'])
      .default('prefer')
      .meta({ label: 'SSL mode' }),
  })
  .meta({ label: 'Host & credentials' });

/** Connection-by-URL mode. Kept as a plain object so hosts can introspect its fields. */
const urlSchema = z
  .object({
    connectionUrl: connectionUrlField,
  })
  .meta({ label: 'Connection URL' });

export const schema = z.union([detailsSchema, urlSchema]);

export type PostgresConfig = z.infer<typeof schema>;
