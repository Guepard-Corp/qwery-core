import { DATASOURCE_INPUT_MAX_LENGTH as L } from '@qwery/extension-sdk';
import { z } from 'zod';

// Plain z.objects (no .refine/.transform) so the TUI can read `.shape` for the
// pick-variant step.
const detailsSchema = z
  .object({
    host: z.string().min(1).max(L.host).meta({ label: 'Host', description: 'ClickHouse server hostname' }),
    port: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .default(8123)
      .meta({ label: 'Port', placeholder: '8123' }),
    username: z
      .string()
      .max(L.username)
      .default('default')
      .meta({ label: 'Username', description: 'ClickHouse user' }),
    password: z.string().max(L.password).optional().meta({ label: 'Password', secret: true }),
    database: z
      .string()
      .max(L.database)
      .default('default')
      .meta({ label: 'Database', description: 'ClickHouse database' }),
  })
  .meta({ label: 'Host & credentials' });

const urlSchema = z
  .object({
    connectionUrl: z.string().min(1).max(L.connectionString).url().meta({
      label: 'Connection URL',
      description: 'ClickHouse URL (clickhouse://user:pass@host:8123/db or http://host:8123)',
      placeholder: 'clickhouse://user:pass@host:8123/default',
      secret: true,
    }),
  })
  .meta({ label: 'Connection URL' });

export const schema = z.union([detailsSchema, urlSchema]);

export type ClickHouseConfig = z.infer<typeof schema>;
