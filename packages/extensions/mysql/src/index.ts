import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { buildMysqlAttachDsn, buildMysqlConfig, catalogNameFor, driverFactory } from './driver';
export { type MysqlConfig, schema } from './schema';

export const extension: DatasourceExtension = {
  id: 'mysql',
  name: 'MySQL',
  icon: '🐬',
  description: 'Connect to a MySQL database — native introspection, federated into the query engine.',
  tags: ['Databases'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  drivers: [{ id: 'mysql.default', name: 'MySQL (Node)', runtime: 'node' }],
};

export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('mysql.default', driverFactory, 'node');
}

register();
