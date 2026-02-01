import type {
  AttachmentStrategy,
  AttachmentResult,
  DuckDBNativeAttachmentOptions,
} from '../types';
import { generateSemanticViewName } from '../../view-registry';
import { getDatasourceDatabaseName } from '../../datasource-name-utils';
import type { SimpleSchema } from '@qwery/domain/entities';
import { getLogger } from '@qwery/shared/logger';

const sanitizeName = (value: string): string => {
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `v_${cleaned}`;
};

/**
 * DuckDB-native providers that create views directly
 * Note: gsheet-csv is handled by GSheetAttachmentStrategy
 */
const DUCKDB_NATIVE_PROVIDERS = [
  'csv',
  'json-online',
  'parquet-online',
  'youtube-data-api-v3',
] as const;

export class DuckDBNativeAttachmentStrategy implements AttachmentStrategy {
  canHandle(provider: string): boolean {
    return DUCKDB_NATIVE_PROVIDERS.includes(
      provider as (typeof DUCKDB_NATIVE_PROVIDERS)[number],
    );
  }

  async attach(
    options: DuckDBNativeAttachmentOptions,
  ): Promise<AttachmentResult> {
    const { connection: conn, datasource, conversationId, workspace } = options;
    const provider = datasource.datasource_provider;
    const config = datasource.config as Record<string, unknown>;

    // Use datasource name directly as database name (sanitized) - same pattern as gsheets
    const attachedDatabaseName = getDatasourceDatabaseName(datasource);
    const escapedDbName = attachedDatabaseName.replace(/"/g, '""');

    // Create persistent attached database using SQLite file (same pattern as gsheets)
    // If conversationId/workspace are provided, create persistent DB; otherwise use in-memory
    let databaseAttached = false;
    try {
      const escapedDbNameForQuery = attachedDatabaseName.replace(/'/g, "''");
      const dbListReader = await conn.runAndReadAll(
        `SELECT name FROM pragma_database_list WHERE name = '${escapedDbNameForQuery}'`,
      );
      await dbListReader.readAll();
      const existingDbs = dbListReader.getRowObjectsJS() as Array<{
        name: string;
      }>;

      if (existingDbs.length === 0) {
        if (conversationId && workspace) {
          // Create persistent database file
          const { join } = await import('node:path');
          const { mkdir } = await import('node:fs/promises');
          const conversationDir = join(workspace, conversationId);
          await mkdir(conversationDir, { recursive: true });
          const dbFilePath = join(
            conversationDir,
            `${attachedDatabaseName}.db`,
          );

          const escapedPath = dbFilePath.replace(/'/g, "''");
          await conn.run(`ATTACH '${escapedPath}' AS "${escapedDbName}"`);
          databaseAttached = true;

          const logger = await getLogger();
          logger.debug(
            `[DuckDBNativeAttach] Attached persistent database: ${attachedDatabaseName} at ${dbFilePath}`,
          );
        } else {
          // Create in-memory attached database for temporary use
          await conn.run(`ATTACH ':memory:' AS "${escapedDbName}"`);
          databaseAttached = true;

          const logger = await getLogger();
          logger.debug(
            `[DuckDBNativeAttach] Attached in-memory database: ${attachedDatabaseName}`,
          );
        }
      } else {
        databaseAttached = true;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to attach database ${attachedDatabaseName}: ${errorMsg}`,
      );
    }

    if (!databaseAttached) {
      throw new Error(
        `Database ${attachedDatabaseName} was not attached successfully`,
      );
    }

    // Drop any existing temp tables from previous runs to ensure clean state
    try {
      const existingTablesReader = await conn.runAndReadAll(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_catalog = '${attachedDatabaseName.replace(/'/g, "''")}' 
           AND table_schema = 'main' 
           AND table_type = 'BASE TABLE'`,
      );
      await existingTablesReader.readAll();
      const existingTables = existingTablesReader.getRowObjectsJS() as Array<{
        table_name: string;
      }>;

      if (existingTables.length > 0) {
        const logger = await getLogger();
        logger.debug(
          `[DuckDBNativeAttach] Dropping ${existingTables.length} existing table(s) to ensure clean state`,
        );
        for (const table of existingTables) {
          const escapedTableName = table.table_name.replace(/"/g, '""');
          try {
            await conn.run(
              `DROP TABLE IF EXISTS "${escapedDbName}"."${escapedTableName}"`,
            );
          } catch (error) {
            logger.warn(
              `[DuckDBNativeAttach] Failed to drop table ${table.table_name}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      const logger = await getLogger();
      logger.warn(
        `[DuckDBNativeAttach] Failed to check/drop existing tables, continuing:`,
        error,
      );
    }

    // Generate a temporary table name for initial creation
    const baseName =
      datasource.name?.trim() ||
      datasource.datasource_provider?.trim() ||
      'data';
    const tempTableName = sanitizeName(
      `tmp_${datasource.id}_${baseName}`.toLowerCase(),
    );
    const escapedTempTableName = tempTableName.replace(/"/g, '""');

    // Create table directly from source based on provider type in the attached database
    switch (provider) {
      case 'csv': {
        const path =
          (config.path as string) ||
          (config.url as string) ||
          (config.connectionUrl as string);
        if (!path) {
          throw new Error('csv datasource requires path or url in config');
        }
        await conn.run(`
          CREATE OR REPLACE TABLE "${escapedDbName}"."${escapedTempTableName}" AS
          SELECT * FROM read_csv_auto('${path.replace(/'/g, "''")}')
        `);
        break;
      }
      case 'json-online': {
        const url =
          (config.jsonUrl as string) ||
          (config.url as string) ||
          (config.connectionUrl as string);
        if (!url) {
          throw new Error(
            'json-online datasource requires jsonUrl, url, or connectionUrl in config',
          );
        }
        await conn.run(`
          CREATE OR REPLACE TABLE "${escapedDbName}"."${escapedTempTableName}" AS
          SELECT * FROM read_json_auto('${url.replace(/'/g, "''")}')
        `);
        break;
      }
      case 'parquet-online': {
        const url = (config.url as string) || (config.connectionUrl as string);
        if (!url) {
          throw new Error(
            'parquet-online datasource requires url or connectionUrl in config',
          );
        }
        await conn.run(`
          CREATE OR REPLACE TABLE "${escapedDbName}"."${escapedTempTableName}" AS
          SELECT * FROM read_parquet('${url.replace(/'/g, "''")}')
        `);
        break;
      }
      default:
        throw new Error(`Unsupported DuckDB-native provider: ${provider}`);
    }

    // Verify the table was created successfully
    try {
      const verifyReader = await conn.runAndReadAll(
        `SELECT 1 FROM "${escapedDbName}"."${escapedTempTableName}" LIMIT 1`,
      );
      await verifyReader.readAll();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to create or verify table "${attachedDatabaseName}.${tempTableName}": ${errorMsg}`,
      );
    }

    // Extract schema directly from the table (same pattern as gsheets)
    let schema: SimpleSchema | undefined;
    try {
      const describeReader = await conn.runAndReadAll(
        `DESCRIBE "${escapedDbName}"."${escapedTempTableName}"`,
      );
      await describeReader.readAll();
      const describeRows = describeReader.getRowObjectsJS() as Array<{
        column_name: string;
        column_type: string;
      }>;

      const columns = describeRows.map((row) => ({
        columnName: row.column_name,
        columnType: row.column_type,
      }));

      schema = {
        databaseName: attachedDatabaseName,
        schemaName: 'main',
        tables: [
          {
            tableName: tempTableName,
            columns,
          },
        ],
      };
    } catch (error) {
      const logger = await getLogger();
      logger.warn(
        `[DuckDBNativeAttach] Failed to extract schema for table ${tempTableName}:`,
        error,
      );
    }

    // Generate semantic name from schema (same pattern as gsheets)
    let finalTableName: string;
    const logger = await getLogger();
    if (schema) {
      finalTableName = generateSemanticViewName(schema, []);
      finalTableName = sanitizeName(finalTableName.toLowerCase());
      logger.debug(
        `[DuckDBNativeAttach] Generated semantic name: ${finalTableName} from schema`,
      );
    } else {
      // Fallback to base name if schema extraction failed
      finalTableName = sanitizeName(baseName.toLowerCase());
      logger.warn(
        `[DuckDBNativeAttach] Schema extraction failed, using base name: ${finalTableName}`,
      );
    }
    const escapedFinalTableName = finalTableName.replace(/"/g, '""');

    // Always rename table to semantic name (even if same, ensures clean state)
    if (finalTableName !== tempTableName) {
      try {
        await conn.run(
          `ALTER TABLE "${escapedDbName}"."${escapedTempTableName}" RENAME TO "${escapedFinalTableName}"`,
        );
        logger.debug(
          `[DuckDBNativeAttach] Renamed table from ${tempTableName} to ${finalTableName}`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(
          `[DuckDBNativeAttach] Failed to rename table from ${tempTableName} to ${finalTableName}: ${errorMsg}`,
        );
        // If rename fails, use temp name
        finalTableName = tempTableName;
      }
    } else {
      logger.debug(
        `[DuckDBNativeAttach] Semantic name matches temp name, keeping: ${finalTableName}`,
      );
    }

    return {
      attachedDatabaseName,
      tables: [
        {
          schema: attachedDatabaseName,
          table: finalTableName,
          path: `${attachedDatabaseName}.${finalTableName}`,
          schemaDefinition: schema,
        },
      ],
    };
  }
}
