import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { driverFactory } from './driver';
export { type PostgresConfig, schema } from './schema';

const DRIVER_ID = 'postgresql.default';
const driver = { id: DRIVER_ID, name: 'PostgreSQL (Node)', runtime: 'node' as const };

/** Vanilla PostgreSQL. */
export const extension: DatasourceExtension = {
  id: 'postgresql',
  name: 'PostgreSQL',
  icon: '🐘',
  description: 'Connect to PostgreSQL databases',
  tags: ['SQL'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  docsUrl: 'https://www.postgresql.org/docs/current/libpq-connect.html',
  drivers: [driver],
};

/** Supabase — Postgres-compatible, shares the default driver. */
export const supabaseExtension: DatasourceExtension = {
  id: 'postgresql-supabase',
  name: 'Supabase',
  icon: '⚡',
  description: 'Connect to Supabase databases',
  tags: ['SQL', 'SaaS'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
  drivers: [driver],
};

/** Neon — Postgres-compatible, shares the default driver. */
export const neonExtension: DatasourceExtension = {
  id: 'postgresql-neon',
  name: 'Neon',
  icon: '🌿',
  description: 'Connect to Neon databases',
  tags: ['SQL', 'SaaS'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  docsUrl: 'https://neon.tech/docs/connect/connect-intro',
  drivers: [driver],
};

/**
 * Self-register the three Postgres-compatible datasources + the shared driver.
 * Hosts trigger this via the side-effecting import.
 */
export function register(): void {
  ExtensionsRegistry.register(extension);
  ExtensionsRegistry.register(supabaseExtension);
  ExtensionsRegistry.register(neonExtension);
  datasources.registerDriver(DRIVER_ID, driverFactory, 'node');
}

register();
