import type { Datasource } from '@qwery/domain/entities';
import type { SimpleSchema } from '@qwery/domain/entities';
import type { DuckDBInstance } from '@duckdb/node-api';
import { getProviderMapping, getSupportedProviders } from './provider-registry';
import { getDatasourceDatabaseName } from './datasource-name-utils';

// Connection type from DuckDB instance
type Connection = Awaited<ReturnType<DuckDBInstance['connect']>>;

export interface ForeignDatasourceAttachOptions {
  connection: Connection; // Changed from dbPath
  datasource: Datasource;
  extractSchema?: boolean; // Default: true for backward compatibility, set to false to skip schema extraction
}

export interface AttachResult {
  attachedDatabaseName: string;
  tables: Array<{
    schema: string;
    table: string;
    path: string;
    schemaDefinition?: SimpleSchema;
  }>;
}

export interface AttachToConnectionOptions {
  conn: Awaited<
    ReturnType<
      Awaited<
        ReturnType<typeof import('@duckdb/node-api').DuckDBInstance.create>
      >['connect']
    >
  >;
  datasource: Datasource;
}

/**
 * Attach a foreign datasource to an existing DuckDB connection
 * This is used when you already have a connection and need to attach datasources
 * (since DuckDB attachments are session-scoped)
 */
export async function attachForeignDatasourceToConnection(
  opts: AttachToConnectionOptions,
): Promise<void> {
  const { conn, datasource } = opts;
  const provider = datasource.datasource_provider;
  const config = datasource.config as Record<string, unknown>;

  // Get provider mapping using abstraction
  const mapping = await getProviderMapping(provider);
  if (!mapping) {
    const supported = await getSupportedProviders();
    throw new Error(
      `Foreign database type not supported: ${provider}. Supported types: ${supported.join(', ')}`,
    );
  }

  // Use datasource name directly as database name (sanitized)
  const attachedDatabaseName = getDatasourceDatabaseName(datasource);

  // Install and load the appropriate extension if needed
  if (mapping.requiresExtension && mapping.extensionName) {
    // Check if extension is already installed (OPTIMIZATION)
    try {
      const checkReader = await conn.runAndReadAll(
        `SELECT extension_name FROM duckdb_extensions() WHERE extension_name = '${mapping.extensionName}'`,
      );
      await checkReader.readAll();
      const extensions = checkReader.getRowObjectsJS() as Array<{
        extension_name: string;
      }>;

      if (extensions.length === 0) {
        await conn.run(`INSTALL ${mapping.extensionName}`);
      }
    } catch {
      // If check fails, try installing anyway
      await conn.run(`INSTALL ${mapping.extensionName}`);
    }

    // Always load (required for each connection)
    await conn.run(`LOAD ${mapping.extensionName}`);
  }

  // Get connection string using abstraction
  let connectionString: string;
  try {
    connectionString = mapping.getConnectionString(config);
  } catch (error) {
    // Skip this datasource if connection string is missing (matches main branch behavior)
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('requires')) {
      return;
    }
    throw error;
  }

  // Build attach query based on DuckDB type
  let attachQuery: string;
  if (mapping.duckdbType === 'SQLITE') {
    attachQuery = `ATTACH '${connectionString.replace(/'/g, "''")}' AS "${attachedDatabaseName}"`;
  } else {
    attachQuery = `ATTACH '${connectionString.replace(/'/g, "''")}' AS "${attachedDatabaseName}" (TYPE ${mapping.duckdbType})`;
  }

  // Attach the foreign database with timeout to prevent indefinite hangs
  const ATTACH_TIMEOUT_MS = 10000; // 10 second timeout per datasource
  try {
    const attachPromise = conn.run(attachQuery);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Attach timeout after ${ATTACH_TIMEOUT_MS / 1000}s for datasource "${attachedDatabaseName}" (${mapping.duckdbType}). Connection to ${datasource.name} may be unavailable or slow.`,
          ),
        );
      }, ATTACH_TIMEOUT_MS);
    });

    await Promise.race([attachPromise, timeoutPromise]);
    console.log(
      `[ReadDataAgent] Attached ${attachedDatabaseName} (${mapping.duckdbType})`,
    );
  } catch (error) {
    // If already attached, that's okay
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      !errorMsg.includes('already attached') &&
      !errorMsg.includes('already exists')
    ) {
      throw error;
    }
  }
}

/**
 * Attach all foreign datasources for a conversation to an existing connection
 * This ensures foreign datasources are available for queries (since attachments are session-scoped)
 */
export async function attachAllForeignDatasourcesToConnection(opts: {
  conn: Awaited<
    ReturnType<
      Awaited<
        ReturnType<typeof import('@duckdb/node-api').DuckDBInstance.create>
      >['connect']
    >
  >;
  datasourceIds: string[];
  datasourceRepository: import('@qwery/domain/repositories').IDatasourceRepository;
}): Promise<void> {
  const { conn, datasourceIds, datasourceRepository } = opts;

  if (!datasourceIds || datasourceIds.length === 0) {
    return;
  }

  const { loadDatasources, groupDatasourcesByType } = await import(
    './datasource-loader'
  );

  try {
    const loaded = await loadDatasources(datasourceIds, datasourceRepository);
    const { foreignDatabases } = groupDatasourcesByType(loaded);

    for (const { datasource } of foreignDatabases) {
      try {
        await attachForeignDatasourceToConnection({ conn, datasource });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Only warn if it's not a "skip" case (missing config returns early, not an error)
        // Log but don't fail - other datasources might still work
        if (
          !errorMsg.includes('already attached') &&
          !errorMsg.includes('already exists')
        ) {
          console.warn(
            `[ReadDataAgent] Failed to attach datasource ${datasource.id}: ${errorMsg}`,
          );
        }
      }
    }
  } catch (error) {
    // Log but don't fail - query might still work with other datasources
    console.warn(
      '[ForeignDatasourceAttach] Failed to load datasources for attachment:',
      error,
    );
  }
}

/**
 * Attach a foreign database to DuckDB and create views
 * Supports PostgreSQL, MySQL, SQLite, etc. via DuckDB foreign data wrappers
 */
export async function attachForeignDatasource(
  opts: ForeignDatasourceAttachOptions,
): Promise<AttachResult> {
  const { connection: conn, datasource, extractSchema = true } = opts;

  const provider = datasource.datasource_provider;
  const config = datasource.config as Record<string, unknown>;
  const tablesInfo: AttachResult['tables'] = [];

  // Get provider mapping using abstraction
  const mapping = await getProviderMapping(provider);
  if (!mapping) {
    const supported = await getSupportedProviders();
    throw new Error(
      `Foreign database type not supported: ${provider}. Supported types: ${supported.join(', ')}`,
    );
  }

  // Use datasource name directly as database name (sanitized)
  const attachedDatabaseName = getDatasourceDatabaseName(datasource);

  // Install and load the appropriate extension if needed
  if (mapping.requiresExtension && mapping.extensionName) {
    await conn.run(`INSTALL ${mapping.extensionName}`);
    await conn.run(`LOAD ${mapping.extensionName}`);
  }

  // Get connection string using abstraction
  const connectionString = mapping.getConnectionString(config);

  // Build attach query based on DuckDB type
  let attachQuery: string;
  if (mapping.duckdbType === 'SQLITE') {
    attachQuery = `ATTACH '${connectionString.replace(/'/g, "''")}' AS "${attachedDatabaseName}"`;
  } else {
    attachQuery = `ATTACH '${connectionString.replace(/'/g, "''")}' AS "${attachedDatabaseName}" (TYPE ${mapping.duckdbType})`;
  }

  // Attach the foreign database
  try {
    await conn.run(attachQuery);
    console.debug(
      `[ForeignDatasourceAttach] Attached ${attachedDatabaseName} (${mapping.duckdbType})`,
    );
  } catch (error) {
    // If already attached, that's okay
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      !errorMsg.includes('already attached') &&
      !errorMsg.includes('already exists')
    ) {
      throw error;
    }
  }

  // Get list of tables from the attached database using abstraction
  const tablesQuery = mapping.getTablesQuery(attachedDatabaseName);

  const tablesReader = await conn.runAndReadAll(tablesQuery);
  await tablesReader.readAll();
  const tables = tablesReader.getRowObjectsJS() as Array<{
    table_schema: string;
    table_name: string;
  }>;

  // Get system schemas using extension abstraction (once, outside loop)
  const { getSystemSchemas, isSystemTableName } = await import(
    './system-schema-filter'
  );
  const systemSchemas = await getSystemSchemas(datasource.datasource_provider);

  // Filter out system tables first
  const userTables = tables.filter((table) => {
    const schemaName = table.table_schema || 'main';
    const tableName = table.table_name;
    return (
      !systemSchemas.has(schemaName.toLowerCase()) &&
      !isSystemTableName(tableName)
    );
  });

  // If schema extraction is disabled, just return table paths without schema
  if (!extractSchema) {
    for (const table of userTables) {
      const schemaName = table.table_schema || 'main';
      const tableName = table.table_name;
      const tablePath = `${attachedDatabaseName}.${schemaName}.${tableName}`;
      tablesInfo.push({
        schema: schemaName,
        table: tableName,
        path: tablePath,
        schemaDefinition: undefined,
      });
    }
    return {
      attachedDatabaseName,
      tables: tablesInfo,
    };
  }

  // Batch fetch all column information in a single query (OPTIMIZATION)
  const escapedDbName = attachedDatabaseName.replace(/"/g, '""');
  const columnsByTable = new Map<
    string,
    Array<{ columnName: string; columnType: string }>
  >();

  try {
    // Build list of (schema, table) pairs for the query
    const tableFilters = userTables
      .map((t) => {
        const schema = (t.table_schema || 'main').replace(/'/g, "''");
        const table = t.table_name.replace(/'/g, "''");
        return `('${schema}', '${table}')`;
      })
      .join(', ');

    if (tableFilters.length > 0) {
      const columnsQuery = `
        SELECT
          table_schema,
          table_name,
          column_name,
          data_type
        FROM "${escapedDbName}".information_schema.columns
        WHERE (table_schema, table_name) IN (${tableFilters})
        ORDER BY table_schema, table_name, ordinal_position
      `;

      const columnsStartTime = performance.now();
      const columnsReader = await conn.runAndReadAll(columnsQuery);
      await columnsReader.readAll();
      const allColumns = columnsReader.getRowObjectsJS() as Array<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
      }>;
      const columnsTime = performance.now() - columnsStartTime;
      console.log(
        `[ForeignDatasourceAttach] [PERF] Batch column query took ${columnsTime.toFixed(2)}ms (${allColumns.length} columns for ${userTables.length} tables)`,
      );

      // Group columns by table
      for (const col of allColumns) {
        const key = `${col.table_schema || 'main'}.${col.table_name}`;
        if (!columnsByTable.has(key)) {
          columnsByTable.set(key, []);
        }
        columnsByTable.get(key)!.push({
          columnName: col.column_name,
          columnType: col.data_type,
        });
      }
    }
  } catch (error) {
    // If batch query fails, fall back to individual DESCRIBE queries
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[ForeignDatasourceAttach] Batch column query failed, falling back to individual DESCRIBE: ${errorMsg}`,
    );
    // Will fall through to individual describe logic below
  }

  // Process each table
  for (const table of userTables) {
    const schemaName = table.table_schema || 'main';
    const tableName = table.table_name;
    const tablePath = `${attachedDatabaseName}.${schemaName}.${tableName}`;
    const tableKey = `${schemaName}.${tableName}`;

    try {
      let schema: SimpleSchema | undefined;

      // Use batched column data if available
      const columns = columnsByTable.get(tableKey);
      if (columns && columns.length > 0) {
        schema = {
          databaseName: attachedDatabaseName,
          schemaName,
          tables: [
            {
              tableName,
              columns,
            },
          ],
        };
      } else {
        // Fallback to individual DESCRIBE if batch didn't work
        try {
          const escapedSchemaName = schemaName.replace(/"/g, '""');
          const escapedTableName = tableName.replace(/"/g, '""');
          const describeQuery = `DESCRIBE "${escapedDbName}"."${escapedSchemaName}"."${escapedTableName}"`;
          const describeReader = await conn.runAndReadAll(describeQuery);
          await describeReader.readAll();
          const describeRows = describeReader.getRowObjectsJS() as Array<{
            column_name: string;
            column_type: string;
            null: string;
          }>;

          schema = {
            databaseName: attachedDatabaseName,
            schemaName,
            tables: [
              {
                tableName,
                columns: describeRows.map((col) => ({
                  columnName: col.column_name,
                  columnType: col.column_type,
                })),
              },
            ],
          };
        } catch {
          // Non-blocking; we still expose the path
          schema = undefined;
        }
      }

      tablesInfo.push({
        schema: schemaName,
        table: tableName,
        path: tablePath,
        schemaDefinition: schema,
      });
    } catch (error) {
      // Log error but continue with other tables
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[ForeignDatasourceAttach] Error processing table ${schemaName}.${tableName}: ${errorMsg}`,
      );
      // Continue with next table
    }
  }

  return {
    attachedDatabaseName,
    tables: tablesInfo,
  };
}
