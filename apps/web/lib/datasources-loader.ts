import registry from '../public/extensions/registry.json';

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
  // SQL Databases
  'clickhouse-node': ['SQL'],
  'clickhouse-web': ['SQL'],
  duckdb: ['SQL'],
  'duckdb-wasm': ['SQL'],
  mysql: ['SQL'],
  pglite: ['SQL'],
  postgresql: ['SQL'],
  'postgresql-supabase': ['SQL', 'SaaS'],
  'postgresql-neon': ['SQL', 'SaaS'],

  // File-based sources
  'gsheet-csv': ['Files', 'SaaS'],
  'json-online': ['Files'],
  'parquet-online': ['Files'],

  // APIs / SaaS
  'youtube-data-api-v3': ['API'],
};

/**
 * Build-time constant containing all datasources from registry.json
 * This is imported at build time and bundled with the app for zero runtime cost
 */
export const DATASOURCES: DatasourceMetadata[] = (
  registry as {
    datasources: Array<{
      id: string;
      name: string;
      description?: string;
      icon?: string;
      packageName: string;
      drivers: Array<{
        id: string;
        name: string;
        description?: string;
        runtime?: string;
      }>;
    }>;
  }
).datasources.map((ds) => ({
  id: ds.id,
  name: ds.name,
  description: ds.description || '',
  logo: ds.icon || '',
  tags: DATASOURCE_TAGS[ds.id] || [],
  drivers: ds.drivers,
}));
