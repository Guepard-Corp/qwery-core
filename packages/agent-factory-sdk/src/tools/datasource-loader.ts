import type { Datasource } from '@qwery/domain/entities';
import type { IDatasourceRepository } from '@qwery/domain/repositories';

export type DatasourceType = 'duckdb-native' | 'foreign-database';

export interface LoadedDatasource {
  datasource: Datasource;
  type: DatasourceType;
}

/**
 * DuckDB-native datasources are extensions that use DuckDB internally
 * These can create views directly in the conversation's DuckDB instance
 *
 * Note: gsheet-csv is treated as a foreign database (attached database)
 * to support multiple tabs with datasourcename.tablename format and semantic naming
 */
const DUCKDB_NATIVE_PROVIDERS = [
  'csv',
  'json-online',
  'parquet-online',
  'youtube-data-api-v3',
  'clickhouse-node', // Uses driver system, not foreign database attachment
  'clickhouse-web', // Uses driver system, not foreign database attachment
  'duckdb', // DuckDB file datasource
  'duckdb-wasm', // DuckDB WASM datasource
] as const;

/**
 * Determine if a datasource is DuckDB-native or a foreign database
 */
export function getDatasourceType(provider: string): DatasourceType {
  if (
    DUCKDB_NATIVE_PROVIDERS.includes(
      provider as (typeof DUCKDB_NATIVE_PROVIDERS)[number],
    )
  ) {
    return 'duckdb-native';
  }
  return 'foreign-database';
}

/**
 * Load datasources from conversation.datasources array
 */
export async function loadDatasources(
  datasourceIds: string[],
  datasourceRepository: IDatasourceRepository,
): Promise<LoadedDatasource[]> {
  const loaded: LoadedDatasource[] = [];

  for (const datasourceId of datasourceIds) {
    try {
      const datasource = await datasourceRepository.findById(datasourceId);
      if (!datasource) {
        console.warn(
          `[DatasourceLoader] Datasource ${datasourceId} not found, skipping`,
        );
        continue;
      }

      const type = getDatasourceType(datasource.datasource_provider);
      loaded.push({
        datasource,
        type,
      });
    } catch (error) {
      console.error(
        `[DatasourceLoader] Failed to load datasource ${datasourceId}:`,
        error,
      );
      // Continue with other datasources even if one fails
    }
  }

  return loaded;
}

/**
 * Group loaded datasources by type
 */
export function groupDatasourcesByType(loaded: LoadedDatasource[]): {
  duckdbNative: LoadedDatasource[];
  foreignDatabases: LoadedDatasource[];
} {
  return {
    duckdbNative: loaded.filter((ds) => ds.type === 'duckdb-native'),
    foreignDatabases: loaded.filter((ds) => ds.type === 'foreign-database'),
  };
}
