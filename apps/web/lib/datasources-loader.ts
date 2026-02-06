import { getDatasourceTypes } from '@qwery/datasource-registry';

type DatasourceMetadata = {
  id: string;
  name: string;
  description: string;
  logo: string;
  tags: string[];
  drivers: Array<{
    id: string;
    name: string;
    description?: string;
    runtime?: string;
  }>;
};

const DATASOURCE_TAGS: Record<string, string[]> = {
  'clickhouse-node': ['SQL'],
  'clickhouse-web': ['SQL'],
  duckdb: ['SQL'],
  'duckdb-wasm': ['SQL'],
  mysql: ['SQL'],
  pglite: ['SQL'],
  postgresql: ['SQL'],
  'postgresql-supabase': ['SQL', 'SaaS'],
  'postgresql-neon': ['SQL', 'SaaS'],
  'gsheet-csv': ['Files', 'SaaS'],
  'json-online': ['Files'],
  'parquet-online': ['Files'],
  s3: ['Files', 'Storage'],
  'youtube-data-api-v3': ['API'],
};

export const DATASOURCES: DatasourceMetadata[] = getDatasourceTypes().map(
  (ds) => ({
    id: ds.id,
    name: ds.name,
    description: ds.description || '',
    logo: ds.icon || '',
    tags: DATASOURCE_TAGS[ds.id] || [],
    drivers: ds.drivers,
  }),
);
