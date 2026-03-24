import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import { z } from 'zod';

const passwordField = z
  .string()
  .min(1)
  .max(DATASOURCE_INPUT_MAX_LENGTH.password)
  .describe('secret:true')
  .meta({
    description: 'MySQL password',
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
      'MySQL connection string (mysql://user:pass@host:port/database)',
    placeholder: 'mysql://user:pass@host:3306/db',
    secret: true,
  });

const detailsSchema = z.object({
  host: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.host)
    .meta({
      label: 'Host',
      description: 'MySQL server hostname',
    }),
  port: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3306)
    .meta({
      label: 'Port',
      placeholder: '3306',
    }),
  username: z
    .string()
    .min(1)
    .max(DATASOURCE_INPUT_MAX_LENGTH.username)
    .meta({
      label: 'Username',
      description: 'MySQL user',
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
      description: 'MySQL database name',
    }),
  ssl: z
    .boolean()
    .default(false)
    .meta({
      label: 'Enable SSL',
      description: 'Enable SSL connection',
    }),
});

const urlSchema = z.object({
  connectionUrl: connectionUrlField,
});

export const schema = z.union([detailsSchema, urlSchema]);

