import type {
  Datasource,
  DatasourceMetadata,
  DatasourceResultSet,
} from '@qwery/domain/entities';
import {
  AbstractQueryEngine,
  type QueryEngineConfig,
} from '@qwery/domain/ports';
import type { DuckDBInstance } from '@duckdb/node-api';
import { DatasourceMetadataZodSchema } from '@qwery/domain/entities';
import { datasourceToDuckdb } from '../tools/datasource-to-duckdb';
import { attachForeignDatasourceToConnection } from '../tools/foreign-datasource-attach';
import { getDatasourceDatabaseName } from '../tools/datasource-name-utils';
import {
  groupDatasourcesByType,
  getDatasourceType,
  type LoadedDatasource,
} from '../tools/datasource-loader';

// Connection type from DuckDB instance
type Connection = Awaited<ReturnType<DuckDBInstance['connect']>>;

/**
 * Recursively converts BigInt values to numbers for JSON serialization.
 */
const convertBigInt = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    if (value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
      return Number(value);
    }
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(convertBigInt);
  }
  if (value && typeof value === 'object') {
    const converted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      converted[key] = convertBigInt(val);
    }
    return converted;
  }
  return value;
};

/**
 * DuckDB implementation of the AbstractQueryEngine.
 *
 * This service provides federated query capabilities using DuckDB as the query engine.
 * It supports attaching multiple datasources (both DuckDB-native and foreign databases)
 * and executing SQL queries across them.
 *
 * @example
 * ```typescript
 * const engine = createQueryEngine(DuckDBQueryEngine);
 * await engine.initialize({
 *   workingDir: 'file:///tmp/duckdb-engine',
 *   config: {}
 * });
 * await engine.attach(datasources);
 * await engine.connect();
 * const result = await engine.query('SELECT * FROM table1 JOIN table2 ON ...');
 * ```
 */
export class DuckDBQueryEngine extends AbstractQueryEngine {
  private instance: DuckDBInstance | null = null;
  private connection: Connection | null = null;
  private workingDir: string | null = null;
  private attachedDatasources: Set<string> = new Set(); // datasource IDs
  private initialized = false;

  /**
   * Determines which DuckDB extension to load based on the workingDir URI protocol.
   */
  private getRequiredExtension(uri: string): string | null {
    const url = new URL(uri);
    const protocol = url.protocol.replace(':', '');

    switch (protocol) {
      case 's3':
      case 'http':
      case 'https':
      case 'hf':
      case 'gs':
        return 'httpfs';
      case 'az':
      case 'azure':
        return 'azure';
      case 'file':
        return null; // No extension needed for file://
      default:
        // For unknown protocols, try httpfs as it's the most common
        return 'httpfs';
    }
  }

  /**
   * Initialize the DuckDB query engine with the provided configuration.
   * Creates an in-memory transient instance, loads required extensions based on
   * workingDir URI protocol, and applies configuration.
   */
  async initialize(config: QueryEngineConfig): Promise<void> {
    if (this.initialized) {
      throw new Error('DuckDBQueryEngine is already initialized');
    }

    const { workingDir, config: engineConfig } = config;

    // Store workingDir for reference
    this.workingDir = workingDir;

    // Create in-memory transient DuckDB instance
    const { DuckDBInstance } = await import('@duckdb/node-api');
    this.instance = await DuckDBInstance.create(':memory:');

    // Create initial connection
    this.connection = await this.instance.connect();

    // Load required extension based on workingDir URI protocol
    const requiredExtension = this.getRequiredExtension(workingDir);
    if (requiredExtension) {
      // Check if extension is already installed
      let isInstalled = false;
      try {
        const checkReader = await this.connection.runAndReadAll(
          `SELECT extension_name FROM duckdb_extensions() WHERE extension_name = '${requiredExtension}'`,
        );
        await checkReader.readAll();
        const extensions = checkReader.getRowObjectsJS() as Array<{
          extension_name: string;
        }>;
        isInstalled = extensions.length > 0;
      } catch {
        // If check fails, assume not installed
        isInstalled = false;
      }

      // Install if not already installed
      if (!isInstalled) {
        try {
          await this.connection.run(`INSTALL ${requiredExtension}`);
          // Verify installation succeeded by checking again
          const verifyReader = await this.connection.runAndReadAll(
            `SELECT extension_name FROM duckdb_extensions() WHERE extension_name = '${requiredExtension}'`,
          );
          await verifyReader.readAll();
          const verified = verifyReader.getRowObjectsJS() as Array<{
            extension_name: string;
          }>;
          if (verified.length === 0) {
            throw new Error(
              `Extension ${requiredExtension} installation completed but extension not found`,
            );
          }
        } catch (installError) {
          const errorMsg =
            installError instanceof Error
              ? installError.message
              : String(installError);
          throw new Error(
            `Failed to install extension ${requiredExtension}: ${errorMsg}. ` +
              `Please ensure the extension is available and network connectivity is working.`,
          );
        }
      }

      // Load the extension (required for each connection)
      try {
        await this.connection.run(`LOAD ${requiredExtension}`);
      } catch (loadError) {
        const errorMsg =
          loadError instanceof Error ? loadError.message : String(loadError);
        throw new Error(
          `Failed to load extension ${requiredExtension}: ${errorMsg}. ` +
            `Extension may not be installed correctly.`,
        );
      }
    }

    // Apply engine-specific configuration
    if (engineConfig) {
      for (const [key, value] of Object.entries(engineConfig)) {
        try {
          // Apply SET statements for configuration
          const escapedValue =
            typeof value === 'string'
              ? `'${value.replace(/'/g, "''")}'`
              : value;
          await this.connection.run(`SET ${key} = ${escapedValue}`);
        } catch (configError) {
          const errorMsg =
            configError instanceof Error
              ? configError.message
              : String(configError);
          console.warn(`Failed to apply config ${key} = ${value}: ${errorMsg}`);
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Attach one or more datasources to the query engine.
   */
  async attach(
    datasources: Datasource[],
    options?: { conversationId?: string; workspace?: string },
  ): Promise<void> {
    if (!this.initialized || !this.connection) {
      throw new Error(
        'DuckDBQueryEngine must be initialized before attaching datasources',
      );
    }

    if (datasources.length === 0) {
      return;
    }

    const { conversationId, workspace } = options || {};

    // Convert Datasource[] to LoadedDatasource[]
    const loaded: LoadedDatasource[] = datasources.map((ds) => ({
      datasource: ds,
      type: getDatasourceType(ds.datasource_provider),
    }));

    const { duckdbNative, foreignDatabases } = groupDatasourcesByType(loaded);

    // Attach foreign databases (PostgreSQL, MySQL, Google Sheets, etc.)
    const attachmentErrors: Array<{ datasourceId: string; error: string }> = [];
    for (const { datasource } of foreignDatabases) {
      // Skip if already attached (optimization)
      if (this.attachedDatasources.has(datasource.id)) {
        console.log(
          `[DuckDBQueryEngine] Datasource ${datasource.id} already attached, skipping`,
        );
        continue;
      }

      try {
        await attachForeignDatasourceToConnection({
          conn: this.connection,
          datasource,
          conversationId,
          workspace,
        });
        this.attachedDatasources.add(datasource.id);
        console.log(
          `[DuckDBQueryEngine] Successfully attached datasource ${datasource.id}`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // If already attached error, mark as attached and continue
        if (
          errorMsg.includes('already attached') ||
          errorMsg.includes('already exists')
        ) {
          this.attachedDatasources.add(datasource.id);
          continue;
        }
        // Log error but continue with other datasources
        const errorMessage = `Failed to attach datasource ${datasource.id}: ${errorMsg}`;
        console.error(`[DuckDBQueryEngine] ${errorMessage}`);
        attachmentErrors.push({ datasourceId: datasource.id, error: errorMsg });
      }
    }

    // Create views for DuckDB-native datasources
    for (const { datasource } of duckdbNative) {
      // Skip if already attached (optimization)
      if (this.attachedDatasources.has(datasource.id)) {
        console.log(
          `[DuckDBQueryEngine] Datasource ${datasource.id} already attached, skipping`,
        );
        continue;
      }

      try {
        await datasourceToDuckdb({
          connection: this.connection,
          datasource,
          conversationId,
          workspace,
        });
        this.attachedDatasources.add(datasource.id);
        console.log(
          `[DuckDBQueryEngine] Successfully created view for datasource ${datasource.id}`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Log error but continue with other datasources
        const errorMessage = `Failed to create view for datasource ${datasource.id}: ${errorMsg}`;
        console.error(`[DuckDBQueryEngine] ${errorMessage}`);
        attachmentErrors.push({ datasourceId: datasource.id, error: errorMsg });
      }
    }

    // Log summary of attachment results
    if (attachmentErrors.length > 0) {
      console.warn(
        `[DuckDBQueryEngine] ${attachmentErrors.length} datasource(s) failed to attach:`,
        attachmentErrors.map((e) => `${e.datasourceId}: ${e.error}`).join(', '),
      );
    }
  }

  /**
   * Detach one or more datasources from the query engine.
   */
  async detach(datasources: Datasource[]): Promise<void> {
    if (!this.initialized || !this.connection) {
      throw new Error(
        'DuckDBQueryEngine must be initialized before detaching datasources',
      );
    }

    if (datasources.length === 0) {
      return;
    }

    // Convert Datasource[] to LoadedDatasource[]
    const loaded: LoadedDatasource[] = datasources.map((ds) => ({
      datasource: ds,
      type: getDatasourceType(ds.datasource_provider),
    }));

    const { foreignDatabases, duckdbNative } = groupDatasourcesByType(loaded);

    // Detach foreign databases
    for (const { datasource } of foreignDatabases) {
      try {
        const attachedDatabaseName = getDatasourceDatabaseName(datasource);
        const escapedDbName = attachedDatabaseName.replace(/"/g, '""');
        await this.connection.run(`DETACH "${escapedDbName}"`);
        this.attachedDatasources.delete(datasource.id);
      } catch (error) {
        // DuckDB doesn't support DETACH IF EXISTS, so we catch errors
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(
          `Failed to detach datasource ${datasource.id}: ${errorMsg}`,
        );
        // Continue with other datasources
      }
    }

    // Drop views for DuckDB-native datasources
    for (const { datasource } of duckdbNative) {
      try {
        // Find all views associated with this datasource ID
        // The view names start with {datasource.id}_
        const viewsReader = await this.connection.runAndReadAll(`
          SELECT table_name 
          FROM information_schema.views 
          WHERE table_schema = 'main' 
            AND table_name LIKE '${datasource.id}_%'
        `);
        await viewsReader.readAll();
        const views = viewsReader.getRowObjectsJS() as Array<{
          table_name: string;
        }>;

        for (const view of views) {
          const escapedViewName = view.table_name.replace(/"/g, '""');
          await this.connection.run(`DROP VIEW IF EXISTS "${escapedViewName}"`);
        }
        this.attachedDatasources.delete(datasource.id);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(
          `Failed to drop views for datasource ${datasource.id}: ${errorMsg}`,
        );
        // Continue with other datasources
      }
    }
  }

  /**
   * Establish connections to all attached datasources.
   * For DuckDB, connections are established during attach, so this is a no-op.
   */
  async connect(): Promise<void> {
    if (!this.initialized || !this.connection) {
      throw new Error(
        'DuckDBQueryEngine must be initialized before connecting',
      );
    }

    // DuckDB connections are established during attach()
    // This method can be used to verify connectivity if needed
    try {
      await this.connection.run('SELECT 1');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to verify DuckDB connection: ${errorMsg}`);
    }
  }

  /**
   * Close all connections and clean up resources.
   */
  async close(): Promise<void> {
    if (!this.initialized) {
      return; // Already closed or never initialized
    }

    try {
      if (this.connection) {
        this.connection.closeSync();
        this.connection = null;
      }

      if (this.instance) {
        // DuckDBInstance doesn't have an explicit close method
        // The instance will be garbage collected
        this.instance = null;
      }

      this.attachedDatasources.clear();
      this.initialized = false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to close DuckDBQueryEngine: ${errorMsg}`);
    }
  }

  /**
   * Execute a SQL query across attached datasources.
   */
  async query(query: string): Promise<DatasourceResultSet> {
    // Apply default limit to prevent OOM on large datasets
    const safeQuery = this.applyDefaultLimit(query);

    if (!this.initialized || !this.connection) {
      throw new Error(
        'DuckDBQueryEngine must be initialized and connected before querying',
      );
    }

    try {
      const startTime = performance.now();
      const resultReader = await this.connection.runAndReadAll(safeQuery);
      await resultReader.readAll();
      const rows = resultReader.getRowObjectsJS() as Array<
        Record<string, unknown>
      >;
      const columnNames = resultReader.columnNames();
      const columnTypes = resultReader.columnTypes();

      // Convert BigInt values to numbers/strings for JSON serialization
      const convertedRows = rows.map(
        (row) => convertBigInt(row) as Record<string, unknown>,
      );

      // Convert column names to ColumnHeader format
      const columns = columnNames.map((name, index) => {
        const duckdbType = columnTypes[index];
        // Convert DuckDBType to string representation
        const originalTypeStr = duckdbType
          ? this.duckdbTypeToString(duckdbType)
          : null;
        return {
          name,
          displayName: name,
          originalType: originalTypeStr,
          type: this.normalizeColumnType(originalTypeStr),
        };
      });

      const queryDurationMs = performance.now() - startTime;

      return {
        columns,
        rows: convertedRows,
        stat: {
          rowsAffected: convertedRows.length,
          rowsRead: convertedRows.length,
          rowsWritten: null,
          queryDurationMs,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Query execution failed: ${errorMsg}`);
    }
  }

  /**
   * Convert DuckDBType to string representation.
   */
  private duckdbTypeToString(type: unknown): string {
    if (typeof type === 'string') {
      return type;
    }
    if (type && typeof type === 'object') {
      // Try to get SQL type representation
      const typeObj = type as Record<string, unknown>;
      if ('sqlType' in typeObj && typeof typeObj.sqlType === 'string') {
        return typeObj.sqlType;
      }
      // Fallback to string representation
      return String(type);
    }
    return String(type);
  }

  /**
   * Normalize DuckDB column types to domain ColumnType.
   */
  private normalizeColumnType(
    originalType: string | null | undefined,
  ):
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'timestamp'
    | 'time'
    | 'json'
    | 'jsonb'
    | 'array'
    | 'blob'
    | 'binary'
    | 'uuid'
    | 'decimal'
    | 'float'
    | 'null'
    | 'unknown'
    | undefined {
    if (!originalType) {
      return undefined;
    }

    const typeLower = originalType.toLowerCase();

    // Integer types
    if (
      typeLower.includes('int') ||
      typeLower === 'bigint' ||
      typeLower === 'smallint' ||
      typeLower === 'tinyint'
    ) {
      return 'integer';
    }

    // Numeric types
    if (
      typeLower.includes('decimal') ||
      typeLower.includes('numeric') ||
      typeLower === 'double' ||
      typeLower === 'real'
    ) {
      return 'decimal';
    }

    // Float types
    if (
      typeLower === 'float' ||
      typeLower === 'float4' ||
      typeLower === 'float8'
    ) {
      return 'float';
    }

    // Boolean
    if (typeLower === 'boolean' || typeLower === 'bool') {
      return 'boolean';
    }

    // Date/time types
    if (typeLower === 'date') {
      return 'date';
    }
    if (typeLower === 'time') {
      return 'time';
    }
    if (typeLower.includes('timestamp')) {
      return 'timestamp';
    }
    if (typeLower.includes('datetime')) {
      return 'datetime';
    }

    // JSON types
    if (typeLower === 'json' || typeLower === 'jsonb') {
      return typeLower as 'json' | 'jsonb';
    }

    // Array types
    if (typeLower.includes('array') || typeLower.includes('[]')) {
      return 'array';
    }

    // Binary types
    if (typeLower.includes('blob') || typeLower.includes('binary')) {
      return 'binary';
    }

    // UUID
    if (typeLower === 'uuid') {
      return 'uuid';
    }

    // String types (default for varchar, text, char, etc.)
    if (
      typeLower.includes('varchar') ||
      typeLower.includes('char') ||
      typeLower === 'text' ||
      typeLower === 'string'
    ) {
      return 'string';
    }

    // Null
    if (typeLower === 'null') {
      return 'null';
    }

    // Unknown
    return 'unknown';
  }

  /**
   * Applies a default limit of 1000 to SELECT queries if not present,
   * or caps existing limits to 1000.
   */
  private applyDefaultLimit(query: string): string {
    const MAX_LIMIT = 1000;
    const trimmed = query.trim();

    // Only apply to SELECT or WITH (CTE) queries
    if (!/^\s*(?:SELECT|WITH)\b/i.test(trimmed)) {
      return query;
    }

    const limitRegex = /\bLIMIT\s+(\d+)\s*(;?)\s*$/i;
    const match = trimmed.match(limitRegex);

    if (match && match[1]) {
      const limit = parseInt(match[1], 10);
      if (limit > MAX_LIMIT) {
        // Cap the limit to MAX_LIMIT
        return trimmed.replace(limitRegex, `LIMIT ${MAX_LIMIT}$2`);
      }
      return query;
    }

    // No LIMIT clause found, append default limit
    if (trimmed.endsWith(';')) {
      return trimmed.slice(0, -1) + ` LIMIT ${MAX_LIMIT};`;
    }

    return trimmed + ` LIMIT ${MAX_LIMIT}`;
  }

  /**
   * Retrieve metadata for attached datasources.
   */
  async metadata(_datasources?: Datasource[]): Promise<DatasourceMetadata> {
    if (!this.initialized || !this.connection) {
      throw new Error(
        'DuckDBQueryEngine must be initialized before retrieving metadata',
      );
    }

    try {
      const allTables: Array<{
        database: string;
        schema: string;
        table: string;
        type: string;
      }> = [];

      try {
        const tablesReader = await this.connection.runAndReadAll(`
            SELECT table_catalog, table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_type IN ('BASE TABLE', 'VIEW')
              AND table_catalog != 'temp'
            ORDER BY table_catalog, table_schema, table_name
          `);
        await tablesReader.readAll();
        const tables = tablesReader.getRowObjectsJS() as Array<{
          table_catalog: string;
          table_schema: string;
          table_name: string;
          table_type: string;
        }>;
        for (const table of tables) {
          // Use table_catalog directly from DuckDB (should be correct for attached databases)
          allTables.push({
            database: table.table_catalog || 'main',
            schema: table.table_schema || 'main',
            table: table.table_name,
            type: table.table_type,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to query tables : ${errorMsg}`);
      }

      // Collect column information for all tables
      const allColumns: Array<{
        database: string;
        schema: string;
        table: string;
        column: string;
        type: string;
        ordinal: number;
        nullable: boolean;
      }> = [];

      for (const { database, schema, table } of allTables) {
        try {
          const escapedSchema = schema.replace(/"/g, '""');
          const escapedTable = table.replace(/"/g, '""');
          const escapedDatabase = database.replace(/"/g, '""');

          const columnsReader = await this.connection.runAndReadAll(`
            SELECT table_catalog, column_name, data_type, ordinal_position, is_nullable
            FROM information_schema.columns
            WHERE table_catalog = '${escapedDatabase.replace(/'/g, "''")}'
              AND table_schema = '${escapedSchema.replace(/'/g, "''")}'
              AND table_name = '${escapedTable.replace(/'/g, "''")}'
            ORDER BY ordinal_position
          `);
          await columnsReader.readAll();
          const columns = columnsReader.getRowObjectsJS() as Array<{
            table_catalog: string;
            column_name: string;
            data_type: string;
            ordinal_position: number | string | bigint;
            is_nullable: string;
          }>;

          for (const col of columns) {
            // Convert ordinal_position to number (handles string, number, or bigint)
            const ordinal =
              typeof col.ordinal_position === 'number'
                ? col.ordinal_position
                : typeof col.ordinal_position === 'bigint'
                  ? Number(col.ordinal_position)
                  : parseInt(String(col.ordinal_position), 10);

            // Use table_catalog from the query result (more accurate than loop variable)
            const colDatabase = col.table_catalog || database;

            allColumns.push({
              database: colDatabase,
              schema,
              table,
              column: col.column_name,
              type: col.data_type,
              ordinal,
              nullable: col.is_nullable === 'YES',
            });
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Failed to query columns for table ${table}: ${errorMsg}`,
          );
          // Skip columns for this table if query fails
          continue;
        }
      }

      // Build DatasourceMetadata structure
      let tableId = 1;
      const schemaMap = new Map<string, number>();
      const tableMap = new Map<
        string,
        {
          id: number;
          schema: string;
          name: string;
          database: string;
        }
      >();

      // Build schemas
      const uniqueSchemas = new Set(
        allTables.map((t) => `${t.database}.${t.schema}`),
      );
      for (const schemaKey of uniqueSchemas) {
        const [_database, _schema] = schemaKey.split('.');
        if (!schemaMap.has(schemaKey)) {
          schemaMap.set(schemaKey, schemaMap.size + 1);
        }
      }

      // Build tables
      for (const { database, schema, table } of allTables) {
        const key = `${database}.${schema}.${table}`;
        if (!tableMap.has(key)) {
          tableMap.set(key, {
            id: tableId++,
            schema,
            name: table,
            database,
          });
        }
      }

      // Build columns
      const columns = allColumns.map((col) => {
        const tableKey = `${col.database}.${col.schema}.${col.table}`;
        const tableInfo = tableMap.get(tableKey);
        if (!tableInfo) {
          throw new Error(`Table not found: ${tableKey}`);
        }

        return {
          id: `${col.schema}.${col.table}.${col.column}`,
          table_id: tableInfo.id,
          schema: col.schema,
          table: col.table,
          name: col.column,
          ordinal_position: col.ordinal,
          data_type: col.type,
          format: col.type,
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: col.nullable,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
          // Add database field for path resolution (from table_catalog)
          database: col.database,
        };
      });

      const tables = Array.from(tableMap.values()).map((table) => ({
        id: table.id,
        schema: table.schema,
        name: table.name,
        rls_enabled: false,
        rls_forced: false,
        bytes: 0,
        size: '0',
        live_rows_estimate: 0,
        dead_rows_estimate: 0,
        comment: null,
        primary_keys: [],
        relationships: [],
      }));

      const schemas = Array.from(schemaMap.entries()).map(([key, id]) => {
        const [, schema] = key.split('.');
        return {
          id,
          name: schema,
          owner: 'unknown',
        };
      });

      return DatasourceMetadataZodSchema.parse({
        version: '0.0.1',
        driver: 'duckdb',
        schemas,
        tables,
        columns,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to retrieve metadata: ${errorMsg}`);
    }
  }

  /**
   * Delete one or more tables/views
   */
  async deleteTable(tableNames: string[]): Promise<{
    deletedTables: string[];
    failedTables: Array<{ tableName: string; error: string }>;
    message: string;
  }> {
    if (!this.initialized || !this.connection) {
      throw new Error(
        'DuckDBQueryEngine must be initialized before deleting tables',
      );
    }

    if (!tableNames || tableNames.length === 0) {
      throw new Error('At least one table name is required');
    }

    const deletedTables: string[] = [];
    const failedTables: Array<{ tableName: string; error: string }> = [];

    // Delete each table using connection
    for (const tableName of tableNames) {
      try {
        const escapedName = tableName.replace(/"/g, '""');
        // Try to drop as VIEW first, then as TABLE
        // DROP VIEW IF EXISTS and DROP TABLE IF EXISTS won't error if the object doesn't exist
        await this.connection.run(`DROP VIEW IF EXISTS "${escapedName}"`);
        await this.connection.run(`DROP TABLE IF EXISTS "${escapedName}"`);
        deletedTables.push(tableName);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        failedTables.push({ tableName, error: errorMsg });
      }
    }

    const successCount = deletedTables.length;
    const failCount = failedTables.length;

    let message: string;
    if (successCount === tableNames.length) {
      message = `Successfully deleted ${successCount} table(s): ${deletedTables.join(', ')}`;
    } else if (successCount > 0) {
      message = `Deleted ${successCount} table(s): ${deletedTables.join(', ')}. Failed to delete ${failCount} table(s): ${failedTables.map((f) => f.tableName).join(', ')}`;
    } else {
      message = `Failed to delete all ${failCount} table(s)`;
    }

    return {
      deletedTables,
      failedTables,
      message,
    };
  }

  /**
   * Rename a table/view
   */
  async renameTable(
    oldTableName: string,
    newTableName: string,
  ): Promise<{
    oldTableName: string;
    newTableName: string;
    message: string;
  }> {
    if (!this.initialized || !this.connection) {
      throw new Error(
        'DuckDBQueryEngine must be initialized before renaming tables',
      );
    }

    // Validate inputs
    if (!oldTableName || !newTableName) {
      throw new Error('Both oldTableName and newTableName are required');
    }

    if (oldTableName === newTableName) {
      throw new Error('Old and new table names cannot be the same');
    }

    const escapedOldName = oldTableName.replace(/"/g, '""');
    const escapedNewName = newTableName.replace(/"/g, '""');

    // Check if old view exists
    try {
      await this.connection.run(`SELECT 1 FROM "${escapedOldName}" LIMIT 1`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes('does not exist') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('Catalog Error')
      ) {
        throw new Error(
          `Table/view "${oldTableName}" does not exist. Cannot rename.`,
        );
      }
      throw error;
    }

    // Check if new name already exists
    try {
      await this.connection.run(`SELECT 1 FROM "${escapedNewName}" LIMIT 1`);
      throw new Error(
        `Table/view "${newTableName}" already exists. Cannot rename to an existing name.`,
      );
    } catch (error) {
      // If error is about table not found, that's good - name is available
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        !errorMsg.includes('does not exist') &&
        !errorMsg.includes('not found') &&
        !errorMsg.includes('Catalog Error') &&
        !errorMsg.includes('already exists')
      ) {
        // Some other error occurred, rethrow
        throw error;
      }
      // If it's "already exists", rethrow that specific error
      if (errorMsg.includes('already exists')) {
        throw error;
      }
    }

    // Rename the view using ALTER VIEW
    await this.connection.run(
      `ALTER VIEW "${escapedOldName}" RENAME TO "${escapedNewName}"`,
    );

    return {
      oldTableName,
      newTableName,
      message: `Successfully renamed table/view "${oldTableName}" to "${newTableName}"`,
    };
  }
}
