import type { SimpleSchema, SimpleTable } from '@qwery/domain/entities';
import type { DatasourceMetadata } from '@qwery/domain/entities';
import { TransformMetadataToSimpleSchemaService } from '@qwery/domain/services';
import { getDatasourceType } from './datasource-loader';
import { getTableNamingFormat } from './table-naming-utils';
import { getLogger } from '@qwery/shared/logger';

export interface ColumnMetadata {
  columnName: string;
  columnType: string;
}

export interface TableInfo {
  tableName: string; // Display path (e.g., datasource.default.table for ClickHouse)
  queryPath?: string; // Query path (e.g., datasource.main.table for ClickHouse) - optional, defaults to tableName
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

  // Query path mapping: display path -> query path (for ClickHouse)
  // Maps datasource.default.table -> datasource.main.table
  private queryPathMap = new Map<string, string>();

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

    const logger = await getLogger();
    logger.debug(
      `[SchemaCache] Transformed metadata: ${schemas.size} schema(s) found, looking for database: ${databaseName}`,
    );
    logger.debug(
      `[SchemaCache] Schema keys: ${Array.from(schemas.keys()).join(', ')}`,
    );
    logger.debug(
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
          logger.debug(
            `[SchemaCache] Found DuckDB-native provider (${provider}) tables in ${dbName} database matching datasource ID`,
          );
        }
      }

      logger.debug(
        `[SchemaCache] Checking schema key: ${schemaKey} (dbName: ${dbName}, expected: ${databaseName}, matches: ${matchesDatabase})`,
      );

      // Only cache if this schema belongs to our datasource
      if (matchesDatabase) {
        const schemaCache = new Map<string, ColumnMetadata[]>();

        for (const table of schema.tables) {
          // Extract table name (already formatted as datasource.schema.table or datasource.table)
          // For ClickHouse, transform service returns datasource.default.table (display format)
          // But we need to store both display and query paths
          const tableName = table.tableName;

          // Special handling for ClickHouse: store both display path and query path
          let displayTableName = tableName; // For agent consumption (datasource.default.table)
          let queryTablePath: string | undefined; // For DuckDB execution (datasource.main.table)

          if (
            (provider === 'clickhouse-node' || provider === 'clickhouse-web') &&
            schemaName === 'main'
          ) {
            // Transform service already converted to display format: datasource.default.table
            // We need to extract the table name and construct the query path: datasource.main.table
            const parts = tableName.split('.');
            if (parts.length === 3 && parts[2] && parts[0]) {
              const datasourceName = parts[0];
              const displaySchema = parts[1]; // This is "default" or "test_schema" (from transform service)
              const baseTableName = parts[2];

              // For ClickHouse, the query path is always datasource.main.table (SQLite limitation)
              // The display path is datasource.{originalSchema}.table (from transform service)
              // Since transform service already converted main -> default, we need to convert back
              queryTablePath = `${datasourceName}.main.${baseTableName}`;
              displayTableName = tableName; // Keep the display format from transform service

              logger.debug(
                `[SchemaCache] ClickHouse table: display="${displayTableName}", query="${queryTablePath}" (display schema: ${displaySchema})`,
              );
            }
          }

          const columns = table.columns.map((col) => ({
            columnName: col.columnName,
            columnType: col.columnType,
          }));

          // Store with display name as key, but also store query path in metadata
          schemaCache.set(displayTableName, columns);

          // Store query path mapping if different from display path
          if (queryTablePath && queryTablePath !== displayTableName) {
            // Store mapping: display path -> query path
            // We'll use this in getAllTablePaths and hasTablePath
            if (!this.queryPathMap) {
              this.queryPathMap = new Map();
            }
            this.queryPathMap.set(displayTableName, queryTablePath);
            logger.debug(
              `[SchemaCache] Stored query path mapping: ${displayTableName} -> ${queryTablePath}`,
            );
          } else {
            logger.debug(
              `[SchemaCache] No query path mapping needed: display="${displayTableName}", query="${queryTablePath || 'N/A'}"`,
            );
          }
          totalTables++;
          totalColumns += columns.length;
        }

        // For ClickHouse, we need to group tables by their original schema names
        // But schema-cache uses schemaName as the key, so we need to handle this
        // For now, we'll cache all tables under "main" but with corrected table names
        // The table names themselves will have the correct schema (e.g., datasource.default.table)
        const cacheSchemaName = schemaName; // Keep as "main" for ClickHouse, table names have correct schema

        if (schemaCache.size > 0) {
          datasourceCache.set(cacheSchemaName, schemaCache);
          logger.debug(
            `[SchemaCache] Cached schema ${cacheSchemaName} with ${schemaCache.size} table(s)`,
          );
        } else {
          logger.debug(
            `[SchemaCache] Schema ${cacheSchemaName} has no tables, skipping`,
          );
        }
      } else {
        logger.debug(
          `[SchemaCache] Schema ${schemaKey} doesn't match datasource database ${databaseName}, skipping`,
        );
      }
    }

    // Store in main cache (even if empty, mark as cached to avoid repeated loads)
    this.cache.set(datasourceId, datasourceCache);
    this.cachedDatasources.add(datasourceId);
    this.providerMap.set(datasourceId, provider);
    this.databaseNameMap.set(datasourceId, databaseName);

    logger.debug(
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
        // Get query path if different from display path
        const queryPath = this.queryPathMap.get(tableName) || tableName;
        tables.push({
          tableName,
          queryPath: queryPath !== tableName ? queryPath : undefined,
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

    // Use table-naming-utils to determine format
    const format = getTableNamingFormat(provider);

    if (format === 'two-part') {
      // Two-part format: datasource.table
      return `${databaseName}.${tableName}`;
    } else {
      // Three-part format: datasource.schema.table
      // For ClickHouse, schemaName might be "main" but tableName already has correct schema
      // Check if tableName already contains the correct format
      if (tableName.includes('.')) {
        // Might already be formatted, check if it starts with databaseName
        if (tableName.startsWith(`${databaseName}.`)) {
          return tableName;
        }
      }
      return `${databaseName}.${schemaName}.${tableName}`;
    }
  }

  /**
   * Get all table paths for a datasource
   * Returns query paths (for validation and execution) - these are the paths DuckDB expects
   * For ClickHouse, this returns datasource.main.table (query path) not datasource.default.table (display path)
   */
  getAllTablePaths(datasourceId: string): string[] {
    const tables = this.getTables(datasourceId);
    // Return query paths if available, otherwise display paths
    // For ClickHouse, we MUST return query paths (datasource.main.table) for validation
    const paths = tables.map((table) => {
      if (table.queryPath) {
        return table.queryPath;
      }
      // If no queryPath, check if this is a ClickHouse display path that needs conversion
      const parts = table.tableName.split('.');
      if (parts.length === 3 && parts[1] !== 'main') {
        // This is a display path, try to get query path from mapping
        const queryPath = this.queryPathMap.get(table.tableName);
        if (queryPath) {
          return queryPath;
        }
      }
      return table.tableName;
    });
    getLogger().then((l) =>
      l.debug(
        `[SchemaCache] getAllTablePaths for ${datasourceId}: ${paths.length} paths, sample: ${paths.slice(0, 3).join(', ')}`,
      ),
    );
    return paths;
  }

  /**
   * Check if a table path exists in any attached datasource
   * @param tablePath - The table path to check (e.g., "datasource.table" or "datasource.schema.table")
   * @returns true if the table exists in any attached datasource
   */
  hasTablePath(tablePath: string): boolean {
    // Check all cached datasources
    // For ClickHouse, we need to check both display paths and query paths
    for (const datasourceId of this.cachedDatasources) {
      const datasourceCache = this.cache.get(datasourceId);
      if (datasourceCache) {
        for (const schemaCache of datasourceCache.values()) {
          for (const cachedTableName of schemaCache.keys()) {
            // Check display path
            if (cachedTableName === tablePath) {
              return true;
            }
            // Check query path (for ClickHouse: datasource.default.table -> datasource.main.table)
            const queryPath = this.queryPathMap.get(cachedTableName);
            if (queryPath === tablePath) {
              return true;
            }
            // Also check reverse: if tablePath is a query path, check if it maps to a display path
            for (const [_displayPath, qPath] of this.queryPathMap.entries()) {
              if (qPath === tablePath) {
                return true;
              }
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
   * Get query path for a display path (for ClickHouse: converts default -> main)
   * Returns the query path if the display path has a mapping, otherwise returns the original path
   */
  getQueryPathForDisplayPath(displayPath: string): string | null {
    getLogger().then((l) =>
      l.debug(
        `[SchemaCache] getQueryPathForDisplayPath called with: ${displayPath}`,
      ),
    );
    getLogger().then((l) =>
      l.debug(`[SchemaCache] queryPathMap size: ${this.queryPathMap.size}`),
    );
    if (this.queryPathMap.size > 0) {
      const entries = Array.from(this.queryPathMap.entries()).slice(0, 5);
      getLogger().then((l) =>
        l.debug(
          `[SchemaCache] queryPathMap entries (first 5): ${entries.map(([k, v]) => `${k}->${v}`).join(', ')}${this.queryPathMap.size > 5 ? '...' : ''}`,
        ),
      );
    }

    // Check if this display path has a query path mapping
    const queryPath = this.queryPathMap.get(displayPath);
    if (queryPath) {
      getLogger().then((l) =>
        l.debug(
          `[SchemaCache] ✓ Found mapping: ${displayPath} -> ${queryPath}`,
        ),
      );
      return queryPath;
    }

    getLogger().then((l) =>
      l.debug(`[SchemaCache] ✗ No mapping found for ${displayPath}`),
    );
    // If no mapping found, check if it's already a query path or doesn't need rewriting
    // For ClickHouse, display paths have schema != 'main', query paths have schema == 'main'
    const parts = displayPath.split('.');
    if (parts.length === 3 && parts[1] !== 'main') {
      // This is a display path but no mapping found - might not be ClickHouse
      getLogger().then((l) =>
        l.debug(
          `[SchemaCache] Path has schema '${parts[1]}' (not 'main'), but no mapping found`,
        ),
      );
      return null;
    }

    return null;
  }

  /**
   * Check if a datasource is cached
   */
  isCached(datasourceId: string): boolean {
    const cached = this.cachedDatasources.has(datasourceId);
    if (cached) {
      const schemas = this.getSchemas(datasourceId);
      const tables = this.getTables(datasourceId);
      getLogger().then((l) =>
        l.debug(
          `[SchemaCache] ✓ Cache HIT for datasource ${datasourceId}: ${schemas.length} schema(s), ${tables.length} table(s)`,
        ),
      );
    } else {
      getLogger().then((l) =>
        l.debug(`[SchemaCache] ✗ Cache MISS for datasource ${datasourceId}`),
      );
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
      getLogger().then((l) =>
        l.debug(
          `[SchemaCache] ✓ Invalidated cache for datasource: ${datasourceId}`,
        ),
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
    this.queryPathMap.clear();
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
    getLogger().then((l) =>
      l.debug(
        `[SchemaCache] Created new cache instance for conversation: ${conversationId}`,
      ),
    );
  } else {
    const cachedCount = cache.getDatasources().length;
    getLogger().then((l) =>
      l.debug(
        `[SchemaCache] Using existing cache for conversation ${conversationId}: ${cachedCount} datasource(s) cached`,
      ),
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
    getLogger().then((l) =>
      l.debug(
        `[SchemaCache] ✓ Cleared cache for conversation ${conversationId} (${cachedCount} datasource(s) removed)`,
      ),
    );
  }
  conversationCaches.delete(conversationId);
}
