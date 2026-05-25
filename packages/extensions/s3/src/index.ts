import {
  type DatasourceExtension,
  datasources,
  ExtensionScope,
  ExtensionsRegistry,
} from '@qwery/extension-sdk';
import { driverFactory } from './driver';
import { schema } from './schema';

export { buildS3UrlPattern, buildSecretSql, driverFactory } from './driver';
export { type S3Config, schema } from './schema';

export const extension: DatasourceExtension = {
  id: 's3',
  name: 'S3',
  icon: '🪣',
  description:
    'Query Parquet/JSON files in S3-compatible storage (AWS, DigitalOcean, MinIO) via DuckDB httpfs.',
  tags: ['Files', 'Cloud'],
  scope: ExtensionScope.DATASOURCE,
  schema,
  drivers: [{ id: 's3.duckdb', name: 'DuckDB (Node)', runtime: 'node' }],
};

export function register(): void {
  ExtensionsRegistry.register(extension);
  datasources.registerDriver('s3.duckdb', driverFactory, 'node');
}

register();
