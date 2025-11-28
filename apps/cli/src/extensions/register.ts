import { registerExtension, ExtensionScope } from '@qwery/extensions-sdk';
import { z } from 'zod';
import { PostgresDatasourceDriver } from './postgres-driver';

let registered = false;

const postgresSchema = z.object({
  connectionUrl: z
    .string()
    .url()
    .describe(
      'PostgreSQL connection string (postgresql://user:pass@host:port/db)',
    ),
});

export function registerCliExtensions(): void {
  if (registered) {
    return;
  }

  // Register PostgreSQL extension
  registerExtension({
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Connect to PostgreSQL databases using the pg driver',
    scope: ExtensionScope.DATASOURCE,
    logo: '/images/datasources/postgresql_icon.png',
    schema: postgresSchema,
    getDriver: async (name: string, config: z.infer<typeof postgresSchema>) => {
      return new PostgresDatasourceDriver(name, config);
    },
  });

  registered = true;
}
