import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { driverFactory } from './driver';
export { type GsheetCsvConfig, schema } from './schema';

export const extension: DatasourceExtension = {
  id: 'gsheet-csv',
  name: 'Google Sheets (CSV)',
  icon: '📊',
  description: 'Query a public Google Sheet via its CSV export, one view per tab.',
  tags: ['Files', 'SaaS'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  docsUrl: 'https://support.google.com/docs/answer/2494822',
  drivers: [{ id: 'gsheet-csv.duckdb', name: 'DuckDB (Node)', runtime: 'node' }],
};

export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('gsheet-csv.duckdb', driverFactory, 'node');
}

register();
