import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { buildAttachSql, catalogNameFor, driverFactory } from './driver';
export { type DuckDbConfig, schema } from './schema';

export const extension: DatasourceExtension = {
  id: 'duckdb',
  name: 'DuckDB',
  icon: '🦆',
  description: 'Attach an external DuckDB database file and query its tables.',
  tags: ['Files'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  drivers: [{ id: 'duckdb.duckdb', name: 'DuckDB (Node)', runtime: 'node' }],
};

export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('duckdb.duckdb', driverFactory, 'node');
}

register();
