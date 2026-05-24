import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { driverFactory } from './driver';
export { type CsvOnlineConfig, schema } from './schema';

export const extension: DatasourceExtension = {
  id: 'csv-online',
  name: 'CSV (Online)',
  icon: '🌐',
  description: 'Query a public CSV file by http(s) URL via DuckDB.',
  tags: ['Files'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  drivers: [{ id: 'csv-online.duckdb', name: 'DuckDB (Node)', runtime: 'node' }],
};

export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('csv-online.duckdb', driverFactory, 'node');
}

register();
