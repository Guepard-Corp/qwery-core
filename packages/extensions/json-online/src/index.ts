import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { driverFactory } from './driver';
export { type JsonOnlineConfig, schema } from './schema';

export const extension: DatasourceExtension = {
  id: 'json-online',
  name: 'JSON (Online)',
  icon: '📋',
  description: 'Query a public JSON file by http(s) URL via DuckDB.',
  tags: ['Files'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  drivers: [{ id: 'json-online.duckdb', name: 'DuckDB (Node)', runtime: 'node' }],
};

export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('json-online.duckdb', driverFactory, 'node');
}

register();
