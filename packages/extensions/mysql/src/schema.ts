import { DATASOURCE_INPUT_MAX_LENGTH as L } from '@qwery/extension-sdk';
import { z } from 'zod';

// Connect-by-fields. Plain z.object (no .refine/.transform) so the TUI can read
// `.shape` for the pick-variant step.
const detailsSchema = z
  .object({
    host: z.string().min(1).max(L.host).meta({ label: 'Host', description: 'MySQL server hostname' }),
    port: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .default(3306)
      .meta({ label: 'Port', placeholder: '3306' }),
    username: z.string().min(1).max(L.username).meta({ label: 'Username', description: 'MySQL user' }),
    password: z
      .string()
      .min(1)
      .max(L.password)
      .meta({ label: 'Password', description: 'MySQL password', secret: true }),
    database: z
      .string()
      .min(1)
      .max(L.database)
      .meta({ label: 'Database', description: 'MySQL database name' }),
    ssl: z.boolean().default(false).meta({ label: 'Enable SSL' }),
  })
  .meta({ label: 'Host & credentials' });

// Connect-by-URL. Kept a plain z.object for the same TUI introspection reason.
const urlSchema = z
  .object({
    connectionUrl: z.string().min(1).max(L.connectionString).url().meta({
      label: 'Connection URL',
      description: 'MySQL connection string (mysql://user:pass@host:port/db)',
      placeholder: 'mysql://user:pass@host:3306/db',
      secret: true,
    }),
  })
  .meta({ label: 'Connection URL' });

export const schema = z.union([detailsSchema, urlSchema]);

export type MysqlConfig = z.infer<typeof schema>;
