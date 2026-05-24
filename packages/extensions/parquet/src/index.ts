import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { driverFactory } from './driver';
export { isRemoteSource, schema } from './schema';

export const extension: DatasourceExtension = {
  id: 'parquet',
  name: 'Parquet (local or HTTP)',
  icon: '📦',
  description: 'Read a Parquet file from disk or an http(s) URL via DuckDB.',
  tags: ['Files'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  drivers: [{ id: 'parquet.duckdb', name: 'DuckDB (Node)', runtime: 'node' }],
};

export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('parquet.duckdb', driverFactory, 'node');
}

register();
