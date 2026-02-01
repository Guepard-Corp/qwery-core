import type {
  AttachmentStrategy,
  AttachmentResult,
  ForeignDatabaseAttachmentOptions,
} from '../types';
import {
  getProviderMapping,
  getSupportedProviders,
} from '../../provider-registry';
import { getDatasourceDatabaseName } from '../../datasource-name-utils';
import { getLogger } from '@qwery/shared/logger';

export class ForeignDatabaseAttachmentStrategy implements AttachmentStrategy {
  canHandle(_provider: string): boolean {
    // This strategy handles providers that can be mapped via provider-registry
    // We'll check this dynamically in attach() method
    return true; // Will be filtered by service based on actual mapping
  }

  async attach(
    options: ForeignDatabaseAttachmentOptions,
  ): Promise<AttachmentResult> {
    const { connection: conn, datasource, extractSchema = true } = options;
    const provider = datasource.datasource_provider;
    const config = datasource.config as Record<string, unknown>;
    const tablesInfo: AttachmentResult['tables'] = [];

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
      // Skip this datasource if connection string is missing
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('requires')) {
        return {
          attachedDatabaseName,
          tables: [],
        };
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

    // Attach the foreign database
    try {
      await conn.run(attachQuery);
      const logger = await getLogger();
      logger.debug(
        `[ForeignDatabaseAttach] Attached ${attachedDatabaseName} (${mapping.duckdbType})`,
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

    // If schema extraction is disabled, return early with empty tables
    if (!extractSchema) {
      return {
        attachedDatabaseName,
        tables: [],
      };
    }

    // Get list of tables from the attached database using abstraction
    const tablesQuery = mapping.getTablesQuery(attachedDatabaseName);

    const tablesReader = await conn.runAndReadAll(tablesQuery);
    await tablesReader.readAll();
    const tables = tablesReader.getRowObjectsJS() as Array<{
      table_schema: string;
      table_name: string;
    }>;

    // Get system schemas using extension abstraction
    const { getSystemSchemas, isSystemTableName } = await import(
      '../../system-schema-filter'
    );
    const systemSchemas = await getSystemSchemas(
      datasource.datasource_provider,
    );

    // Filter out system tables first
    const userTables = tables.filter((table) => {
      const schemaName = table.table_schema || 'main';
      const tableName = table.table_name;
      return (
        !systemSchemas.has(schemaName.toLowerCase()) &&
        !isSystemTableName(tableName)
      );
    });

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
        const logger = await getLogger();
        logger.debug(
          `[ForeignDatabaseAttach] [PERF] Batch column query took ${columnsTime.toFixed(2)}ms (${allColumns.length} columns for ${userTables.length} tables)`,
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
      const logger = await getLogger();
      logger.warn(
        `[ForeignDatabaseAttach] Batch column query failed, falling back to individual DESCRIBE: ${errorMsg}`,
      );
    }

    // Process each table
    for (const table of userTables) {
      const schemaName = table.table_schema || 'main';
      const tableName = table.table_name;
      const tablePath = `${attachedDatabaseName}.${schemaName}.${tableName}`;
      const tableKey = `${schemaName}.${tableName}`;

      try {
        let schema = undefined;

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
        const logger = await getLogger();
        logger.error(
          `[ForeignDatabaseAttach] Error processing table ${schemaName}.${tableName}: ${errorMsg}`,
        );
      }
    }

    return {
      attachedDatabaseName,
      tables: tablesInfo,
    };
  }
}
