import { z } from 'zod';

const passwordField = z
  .string()
  .min(1)
  .describe('secret:true')
  .meta({
    description: 'Database password',
    secret: true,
  });

const connectionUrlField = z
  .string()
  .min(1)
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
    .number()
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
    .meta({
      label: 'Username',
      description: 'Database user',
    }),
  user: z
    .string()
    .min(1)
    .optional()
    .meta({
      label: 'User (alias for username)',
    }),
  password: passwordField,
  database: z
    .string()
    .min(1)
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

const urlSchema = z.object({
  connectionUrl: connectionUrlField,
});

export const schema = z.union([detailsSchema, urlSchema]);

