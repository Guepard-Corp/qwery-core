import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { driverFactory } from './driver';
export { schema } from './schema';

export const extension: DatasourceExtension = {
  id: 'csv-local',
  name: 'CSV (local file)',
  icon: '📄',
  description: 'Read a local CSV file from disk via DuckDB.',
  tags: ['Files'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  drivers: [{ id: 'csv-local.duckdb', name: 'DuckDB (Node)', runtime: 'node' }],
};

/**
 * Self-register the extension definition + driver. Hosts call this once at
 * startup (or it auto-runs via import side-effects).
 */
export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('csv-local.duckdb', driverFactory, 'node');
}

register();
