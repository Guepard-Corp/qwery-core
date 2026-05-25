import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { buildClickHouseConfig, driverFactory } from './driver';
export { type ClickHouseConfig, schema } from './schema';

export const extension: DatasourceExtension = {
  id: 'clickhouse-node',
  name: 'ClickHouse',
  icon: '🟡',
  description: 'Connect to a ClickHouse server and query it natively via the HTTP client.',
  tags: ['Databases'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  drivers: [{ id: 'clickhouse-node.default', name: 'ClickHouse (Node)', runtime: 'node' }],
};

export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('clickhouse-node.default', driverFactory, 'node');
}

register();
