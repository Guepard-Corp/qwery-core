import type { SimpleSchema, SimpleTable } from '@qwery/domain/entities';
import type { DatasourceMetadata } from '@qwery/domain/entities';
import { TransformMetadataToSimpleSchemaService } from '@qwery/domain/services';
import { getDatasourceType } from './datasource-loader';

export interface ColumnMetadata {
  columnName: string;
  columnType: string;
}

export interface TableInfo {
  tableName: string;
  schemaName: string;
  databaseName: string;
  columns: ColumnMetadata[];
}

/**
 * Nested hashmap structure for schema caching:
 * datasourceId -> schemaName -> tableName -> columns[]
 */
export class SchemaCacheManager {
  // Main cache: datasourceId -> schemaName -> tableName -> columns[]
  private cache = new Map<string, Map<string, Map<string, ColumnMetadata[]>>>();

  // Track which datasources are cached
  private cachedDatasources = new Set<string>();

  // Provider info for path resolution: datasourceId -> provider
  private providerMap = new Map<string, string>();

  // Database name mapping: datasourceId -> databaseName
  private databaseNameMap = new Map<string, string>();

  /**
   * Load schema for a datasource and cache it
   */
  async loadSchemaForDatasource(
    datasourceId: string,
    metadata: DatasourceMetadata,
    provider: string,
    databaseName: string,
  ): Promise<void> {
    // Build datasource maps for transformation
    const datasourceDatabaseMap = new Map<string, string>();
    const datasourceProviderMap = new Map<string, string>();
    datasourceDatabaseMap.set(datasourceId, databaseName);
    datasourceProviderMap.set(datasourceId, provider);

    // Transform metadata to SimpleSchema format
    const transformService = new TransformMetadataToSimpleSchemaService();
    const schemas = await transformService.execute({
      metadata,
      datasourceDatabaseMap,
      datasourceProviderMap,
    });

    console.log(
      `[SchemaCache] Transformed metadata: ${schemas.size} schema(s) found, looking for database: ${databaseName}`,
    );
    console.log(
      `[SchemaCache] Schema keys: ${Array.from(schemas.keys()).join(', ')}`,
    );
    console.log(
      `[SchemaCache] Datasource database map: ${Array.from(
        datasourceDatabaseMap.entries(),
      )
        .map(([id, name]) => `${id}=${name}`)
        .join(', ')}`,
    );

    // Build nested cache structure
    const datasourceCache = new Map<string, Map<string, ColumnMetadata[]>>();
    let totalTables = 0;
    let totalColumns = 0;

    // Get all database names that belong to this datasource (from the map)
    const datasourceDatabaseNames = new Set<string>();
    for (const [dsId, dbName] of datasourceDatabaseMap.entries()) {
      if (dsId === datasourceId) {
        datasourceDatabaseNames.add(dbName);
      }
    }
    // Also add the passed databaseName as fallback
    datasourceDatabaseNames.add(databaseName);

    // For DuckDB-native providers, tables might be in 'main' or 'memory' database
    // We need to match by table names containing the datasource ID or name
    const datasourceType = getDatasourceType(provider);
    const isDuckDBNative = datasourceType === 'duckdb-native';
    const datasourceIdShort = datasourceId.replace(/-/g, '_'); // Convert UUID format for matching

    for (const [schemaKey, schema] of schemas.entries()) {
      // schemaKey format: "databaseName.schemaName"
      const parts = schemaKey.split('.');
      const dbName = parts[0] || 'main';
      const schemaName = parts[1] || 'main';

      // Check if this database name matches our datasource
      // Match by database name (case-insensitive for safety) or check if it's in our datasource map
      const dbNameLower = dbName.toLowerCase();
      let matchesDatabase =
        datasourceDatabaseNames.has(dbName) ||
        Array.from(datasourceDatabaseNames).some(
          (name) => name.toLowerCase() === dbNameLower,
        );

      // For DuckDB-native providers, also check if tables are in main/memory and contain datasource ID
      if (
        !matchesDatabase &&
        isDuckDBNative &&
        (dbName === 'main' || dbName === 'memory')
      ) {
        // Check if any table name contains the datasource ID
        const hasMatchingTable = schema.tables.some((table) => {
          const tableName = table.tableName.toLowerCase();
          return (
            tableName.includes(datasourceIdShort.toLowerCase()) ||
            tableName.includes(datasourceId.toLowerCase())
          );
        });
        if (hasMatchingTable) {
          matchesDatabase = true;
          console.log(
            `[SchemaCache] Found DuckDB-native provider (${provider}) tables in ${dbName} database matching datasource ID`,
          );
        }
      }

      console.log(
        `[SchemaCache] Checking schema key: ${schemaKey} (dbName: ${dbName}, expected: ${databaseName}, matches: ${matchesDatabase})`,
      );

      // Only cache if this schema belongs to our datasource
      if (matchesDatabase) {
        const schemaCache = new Map<string, ColumnMetadata[]>();

        for (const table of schema.tables) {
          // Extract table name (already formatted as datasource.schema.table or datasource.table)
          // The transform service handles all formatting, so we use it as-is
          const tableName = table.tableName;
          const columns = table.columns.map((col) => ({
            columnName: col.columnName,
            columnType: col.columnType,
          }));

          schemaCache.set(tableName, columns);
          totalTables++;
          totalColumns += columns.length;
        }

        if (schemaCache.size > 0) {
          datasourceCache.set(schemaName, schemaCache);
          console.log(
            `[SchemaCache] Cached schema ${schemaName} with ${schemaCache.size} table(s)`,
          );
        } else {
          console.log(
            `[SchemaCache] Schema ${schemaName} has no tables, skipping`,
          );
        }
      } else {
        console.log(
          `[SchemaCache] Schema ${schemaKey} doesn't match datasource database ${databaseName}, skipping`,
        );
      }
    }

    // Store in main cache (even if empty, mark as cached to avoid repeated loads)
    this.cache.set(datasourceId, datasourceCache);
    this.cachedDatasources.add(datasourceId);
    this.providerMap.set(datasourceId, provider);
    this.databaseNameMap.set(datasourceId, databaseName);

    console.log(
      `[SchemaCache] ✓ Cached datasource ${datasourceId}: ${datasourceCache.size} schema(s), ${totalTables} table(s), ${totalColumns} column(s)`,
    );
  }

  /**
   * Get all datasource IDs that are cached
   */
  getDatasources(): string[] {
    return Array.from(this.cachedDatasources);
  }

  /**
   * Get all schema names for a datasource
   */
  getSchemas(datasourceId: string): string[] {
    const datasourceCache = this.cache.get(datasourceId);
    if (!datasourceCache) {
      return [];
    }
    return Array.from(datasourceCache.keys());
  }

  /**
   * Get all tables for a datasource, optionally filtered by schema
   */
  getTables(datasourceId: string, schemaName?: string): TableInfo[] {
    const datasourceCache = this.cache.get(datasourceId);
    if (!datasourceCache) {
      return [];
    }

    const databaseName = this.databaseNameMap.get(datasourceId) || 'main';
    const tables: TableInfo[] = [];

    const schemasToProcess = schemaName
      ? [schemaName]
      : Array.from(datasourceCache.keys());

    for (const schema of schemasToProcess) {
      const schemaCache = datasourceCache.get(schema);
      if (!schemaCache) continue;

      for (const [tableName, columns] of schemaCache.entries()) {
        tables.push({
          tableName,
          schemaName: schema,
          databaseName,
          columns,
        });
      }
    }

    return tables;
  }

  /**
   * Get columns for a specific table
   */
  getColumns(
    datasourceId: string,
    schemaName: string,
    tableName: string,
  ): ColumnMetadata[] {
    const datasourceCache = this.cache.get(datasourceId);
    if (!datasourceCache) {
      return [];
    }

    const schemaCache = datasourceCache.get(schemaName);
    if (!schemaCache) {
      return [];
    }

    return schemaCache.get(tableName) || [];
  }

  /**
   * Get formatted table path (datasource.schema.table or datasource.table)
   * Note: tableName might already be formatted, so check before formatting again
   */
  getTablePath(
    datasourceId: string,
    schemaName: string,
    tableName: string,
  ): string {
    const databaseName = this.databaseNameMap.get(datasourceId) || 'main';

    // If tableName already contains dots, it's likely already formatted
    // Check if it starts with the database name to confirm
    if (tableName.includes('.')) {
      if (tableName.startsWith(`${databaseName}.`)) {
        // Already formatted, return as-is
        return tableName;
      }
    }

    const provider = this.providerMap.get(datasourceId);

    if (!provider) {
      // Default to three-part if provider unknown
      return `${databaseName}.${schemaName}.${tableName}`;
    }

    // Determine table path format based on datasource type
    // DuckDB-native providers (gsheet-csv, json-online, parquet-online, etc.) use two-part: datasource.table
    // Foreign databases (postgresql, mysql, etc.) use three-part: datasource.schema.table
    const datasourceType = getDatasourceType(provider);

    if (datasourceType === 'duckdb-native') {
      // Two-part format for DuckDB-native providers
      return `${databaseName}.${tableName}`;
    }

    // Three-part format for foreign databases
    return `${databaseName}.${schemaName}.${tableName}`;
  }

  /**
   * Get all table paths for a datasource
   * Note: table.tableName is already formatted (e.g., "datasource.schema.table"),
   * so we return it as-is instead of formatting again
   */
  getAllTablePaths(datasourceId: string): string[] {
    const tables = this.getTables(datasourceId);
    // table.tableName is already formatted from the transform service,
    // so return it directly instead of reformatting
    return tables.map((table) => table.tableName);
  }

  /**
   * Check if a table path exists in any attached datasource
   * @param tablePath - The table path to check (e.g., "datasource.table" or "datasource.schema.table")
   * @returns true if the table exists in any attached datasource
   */
  hasTablePath(tablePath: string): boolean {
    // Normalize the input path (remove quotes, lowercase for comparison)
    const normalizedPath = tablePath
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/"([^"]+)"/g, '$1') // Remove all double quotes
      .replace(/'([^']+)'/g, '$1') // Remove all single quotes
      .trim();

    // Check all cached datasources
    // table.tableName in cache is already formatted, so we can check directly
    for (const datasourceId of this.cachedDatasources) {
      const datasourceCache = this.cache.get(datasourceId);
      if (datasourceCache) {
        for (const schemaCache of datasourceCache.values()) {
          for (const cachedTableName of schemaCache.keys()) {
            // Exact match
            if (cachedTableName === normalizedPath) {
              return true;
            }
            // Also check case-insensitive match (for safety)
            if (
              cachedTableName.toLowerCase() === normalizedPath.toLowerCase()
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Get all table paths from all attached datasources
   */
  getAllTablePathsFromAllDatasources(): string[] {
    const allPaths: string[] = [];
    for (const datasourceId of this.cachedDatasources) {
      allPaths.push(...this.getAllTablePaths(datasourceId));
    }
    return allPaths;
  }

  /**
   * Check if a datasource is cached
   */
  isCached(datasourceId: string): boolean {
    const cached = this.cachedDatasources.has(datasourceId);
    if (cached) {
      const schemas = this.getSchemas(datasourceId);
      const tables = this.getTables(datasourceId);
      console.log(
        `[SchemaCache] ✓ Cache HIT for datasource ${datasourceId}: ${schemas.length} schema(s), ${tables.length} table(s)`,
      );
    } else {
      console.log(`[SchemaCache] ✗ Cache MISS for datasource ${datasourceId}`);
    }
    return cached;
  }

  /**
   * Invalidate cache for a datasource
   */
  invalidate(datasourceId: string): void {
    const hadCache = this.cachedDatasources.has(datasourceId);
    this.cache.delete(datasourceId);
    this.cachedDatasources.delete(datasourceId);
    this.providerMap.delete(datasourceId);
    this.databaseNameMap.delete(datasourceId);
    if (hadCache) {
      console.log(
        `[SchemaCache] ✓ Invalidated cache for datasource: ${datasourceId}`,
      );
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.cachedDatasources.clear();
    this.providerMap.clear();
    this.databaseNameMap.clear();
  }

  /**
   * Convert cached data to SimpleSchema format for agent consumption
   */
  toSimpleSchemas(
    datasourceIds?: string[],
    schemaNames?: string[],
    tableNames?: string[],
  ): Map<string, SimpleSchema> {
    const result = new Map<string, SimpleSchema>();

    const datasourcesToProcess = datasourceIds
      ? datasourceIds.filter((id) => this.isCached(id))
      : this.getDatasources();

    for (const datasourceId of datasourcesToProcess) {
      const databaseName = this.databaseNameMap.get(datasourceId) || 'main';
      const schemas = this.getSchemas(datasourceId);

      const schemasToProcess = schemaNames
        ? schemas.filter((s) => schemaNames.includes(s))
        : schemas;

      for (const schemaName of schemasToProcess) {
        const schemaKey = `${databaseName}.${schemaName}`;
        const tables = this.getTables(datasourceId, schemaName);

        const filteredTables = tableNames
          ? tables.filter((t) => tableNames.includes(t.tableName))
          : tables;

        if (filteredTables.length === 0) continue;

        const simpleTables: SimpleTable[] = filteredTables.map((table) => ({
          tableName: table.tableName,
          columns: table.columns,
        }));

        // Merge with existing schema if present
        const existing = result.get(schemaKey);
        if (existing) {
          existing.tables.push(...simpleTables);
        } else {
          result.set(schemaKey, {
            databaseName,
            schemaName,
            tables: simpleTables,
          });
        }
      }
    }

    return result;
  }
}

/**
 * Per-conversation schema cache instances
 * Key: conversationId, Value: SchemaCacheManager instance
 */
const conversationCaches = new Map<string, SchemaCacheManager>();

/**
 * Get or create schema cache for a conversation
 */
export function getSchemaCache(conversationId: string): SchemaCacheManager {
  let cache = conversationCaches.get(conversationId);
  if (!cache) {
    cache = new SchemaCacheManager();
    conversationCaches.set(conversationId, cache);
    console.log(
      `[SchemaCache] Created new cache instance for conversation: ${conversationId}`,
    );
  } else {
    const cachedCount = cache.getDatasources().length;
    console.log(
      `[SchemaCache] Using existing cache for conversation ${conversationId}: ${cachedCount} datasource(s) cached`,
    );
  }
  return cache;
}

/**
 * Clear schema cache for a conversation
 */
export function clearSchemaCache(conversationId: string): void {
  const cache = conversationCaches.get(conversationId);
  if (cache) {
    const cachedCount = cache.getDatasources().length;
    cache.clear();
    console.log(
      `[SchemaCache] ✓ Cleared cache for conversation ${conversationId} (${cachedCount} datasource(s) removed)`,
    );
  }
  conversationCaches.delete(conversationId);
}
