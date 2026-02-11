import { z } from 'zod';

const passwordField = z
  .string()
  .min(1)
  .meta({
    description: 'ClickHouse password',
    secret: true,
  });

const connectionUrlField = z
  .url()
  .min(1)
  .meta({
    description:
      'ClickHouse connection URL (clickhouse://user:pass@host:port/database or http://host:port)',
    placeholder:
      'clickhouse://user:pass@host:8123/default or http://host:8123',
    secret: true,
  });

const detailsSchema = z.object({
  host: z
    .string()
    .min(1)
    .meta({
      label: 'Host',
      description: 'ClickHouse server hostname',
    }),
  port: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(8123)
    .meta({
      label: 'Port',
      placeholder: '8123',
    }),
  username: z
    .string()
    .default('default')
    .meta({
      label: 'Username',
      description: 'ClickHouse user',
    }),
  user: z
    .string()
    .default('default')
    .optional()
    .meta({
      label: 'User (alias for username)',
    }),
  password: passwordField.optional(),
  database: z
    .string()
    .default('default')
    .meta({
      label: 'Database',
      description: 'ClickHouse database name',
    }),
});

const urlSchema = z.object({
  connectionUrl: connectionUrlField,
});

export const schema = z.union([detailsSchema, urlSchema]);

