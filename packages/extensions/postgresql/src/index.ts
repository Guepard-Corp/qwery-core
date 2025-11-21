import { z } from 'zod';

import { ExtensionScope, registerExtension } from '@qwery/extensions-sdk';

import { PostgresDatasourceDriver } from './driver';

const schema = z.object({
  connectionUrl: z
    .string()
    .url()
    .describe(
      'PostgreSQL connection string (postgresql://user:pass@host:port/db)',
    ),
});

let registered = false;

export function registerPostgresqlExtension(): void {
  if (registered) {
    return;
  }

  registerExtension({
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Connect to PostgreSQL databases using the pg driver',
    logo: '/images/datasources/postgresql.png',
    scope: ExtensionScope.DATASOURCE,
    schema,
    getDriver: async (name: string, config: z.infer<typeof schema>) => {
      return new PostgresDatasourceDriver(name, config);
    },
  });

  registered = true;
}

export { PostgresDatasourceDriver };
