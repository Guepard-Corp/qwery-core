import type {
  SimpleSchema,
  SimpleTable,
  SimpleColumn,
} from '@qwery/domain/entities';
import type { DuckDBInstance } from '@duckdb/node-api';
import { getLogger } from '@qwery/shared/logger';

// Connection type from DuckDB instance
type Connection = Awaited<ReturnType<DuckDBInstance['connect']>>;

export interface ExtractSchemaOptions {
  connection: Connection; // Changed from dbPath
  viewName?: string;
  allowTempTables?: boolean; // Allow temp tables during creation process
}

export const extractSchema = async (
  opts: ExtractSchemaOptions,
): Promise<SimpleSchema> => {
  const conn = opts.connection;

  const logger = await getLogger();
  logger.debug(
    `[ExtractSchema] Extracting schema${opts.viewName ? ` for view: ${opts.viewName}` : ' (all views)'}`,
  );

  // Import validation function
  const { isSystemOrTempTable } = await import('./view-registry');

  // Validate view exists and is not temp if viewName is provided
  // But allow temp tables during creation process (allowTempTables = true)
  if (opts.viewName) {
    if (!opts.allowTempTables && isSystemOrTempTable(opts.viewName)) {
      throw new Error(
        `Cannot extract schema from system/temp table: ${opts.viewName}`,
      );
    }

    // Check if view/table exists
    // For attached databases (format: database.schema.table), use information_schema
    // For main database views, use DESCRIBE
    const viewNameParts = opts.viewName.split('.');
    const isAttachedDatabase = viewNameParts.length >= 3;

    if (isAttachedDatabase) {
      // For attached databases, check via information_schema
      try {
        const database = viewNameParts[0];
        const schema = viewNameParts[1];
        const table = viewNameParts[2];
        if (!database || !schema || !table) {
          throw new Error(`Invalid table path format: ${opts.viewName}`);
        }
        const escapedDatabase = database.replace(/"/g, '""');
        const escapedSchema = schema.replace(/"/g, '""');
        const escapedTable = table.replace(/"/g, '""');
        const checkReader = await conn.runAndReadAll(`
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_catalog = '${escapedDatabase}' 
            AND table_schema = '${escapedSchema}' 
            AND table_name = '${escapedTable}'
          LIMIT 1
        `);
        await checkReader.readAll();
        const exists = checkReader.getRowObjectsJS().length > 0;
        if (!exists) {
          throw new Error(
            `View or table '${opts.viewName}' does not exist in database`,
          );
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('does not exist')
        ) {
          throw error;
        }
        // Fallback to DESCRIBE if information_schema check fails
        try {
          const escapedViewName = opts.viewName.replace(/"/g, '""');
          await conn.run(`DESCRIBE "${escapedViewName}"`);
        } catch {
          throw new Error(
            `View or table '${opts.viewName}' does not exist in database`,
          );
        }
      }
    } else {
      // For main database views, use DESCRIBE
      try {
        const escapedViewName = opts.viewName.replace(/"/g, '""');
        await conn.run(`DESCRIBE "${escapedViewName}"`);
      } catch {
        throw new Error(
          `View or table '${opts.viewName}' does not exist in database`,
        );
      }
    }
  }
  // If no viewName specified, get all views
  if (!opts.viewName) {
    const viewsReader = await conn.runAndReadAll(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'main'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sqlite_%'
        AND table_name NOT LIKE '\\_%' ESCAPE '\\'
        ORDER BY table_name
      `);
    await viewsReader.readAll();
    const allViews = viewsReader.getRowObjectsJS() as Array<{
      table_name: string;
    }>;

    // Import system schema filter utilities
    const { getAllSystemSchemas, isSystemTableName } = await import(
      './system-schema-filter'
    );
    const allSystemSchemas = getAllSystemSchemas();
    const { isSystemOrTempTable } = await import('./view-registry');

    // Filter out known system views and temp tables - only return views that look like user-created views
    const views = allViews.filter((v) => {
      const name = v.table_name;

      // Exclude system/temp tables
      if (isSystemOrTempTable(name)) {
        return false; // NO LOGGING
      }

      // Exclude system tables using consistent filter
      if (isSystemTableName(name)) {
        return false; // NO LOGGING
      }

      // Exclude views with dots (schema-qualified) that are system schemas
      const nameLower = name.toLowerCase();
      if (nameLower.includes('.')) {
        const parts = nameLower.split('.');
        if (parts.length >= 2 && allSystemSchemas.has(parts[0] || '')) {
          return false; // NO LOGGING
        }
      }

      // Exclude special characters
      if (nameLower.includes('$') || nameLower.includes('#')) {
        return false; // NO LOGGING
      }

      return true;
    });

    // If we still have too many views, try to identify user-created ones
    // by checking if they match common naming patterns (e.g., sheet_*, my_*, etc.)
    // For now, just return all filtered views and let the caller handle it

    const tables: SimpleTable[] = [];
    for (const view of views) {
      const viewName = view.table_name.replace(/"/g, '""');
      const schemaReader = await conn.runAndReadAll(`DESCRIBE "${viewName}"`);
      await schemaReader.readAll();
      const schemaRows = schemaReader.getRowObjectsJS() as Array<{
        column_name: string;
        column_type: string;
      }>;

      const columns: SimpleColumn[] = schemaRows.map((row) => ({
        columnName: row.column_name,
        columnType: row.column_type,
      }));

      tables.push({
        tableName: view.table_name,
        columns,
      });
    }

    return {
      databaseName: 'google_sheet',
      schemaName: 'google_sheet',
      tables,
    };
  }

  // Get schema information using DESCRIBE or information_schema
  const viewName = opts.viewName.replace(/"/g, '""');
  const viewNameParts = opts.viewName.split('.');
  const isAttachedDatabase = viewNameParts.length >= 3;

  let schemaRows: Array<{ column_name: string; column_type: string }>;

  if (isAttachedDatabase) {
    // For attached databases, use information_schema.columns
    const database = viewNameParts[0];
    const schema = viewNameParts[1];
    const table = viewNameParts[2];
    if (!database || !schema || !table) {
      throw new Error(`Invalid table path format: ${opts.viewName}`);
    }
    const escapedDatabase = database.replace(/"/g, '""');
    const escapedSchema = schema.replace(/"/g, '""');
    const escapedTable = table.replace(/"/g, '""');
    const schemaReader = await conn.runAndReadAll(`
      SELECT column_name, data_type as column_type
      FROM information_schema.columns
      WHERE table_catalog = '${escapedDatabase}'
        AND table_schema = '${escapedSchema}'
        AND table_name = '${escapedTable}'
      ORDER BY ordinal_position
    `);
    await schemaReader.readAll();
    schemaRows = schemaReader.getRowObjectsJS() as Array<{
      column_name: string;
      column_type: string;
    }>;
  } else {
    // For main database views, use DESCRIBE
    const schemaReader = await conn.runAndReadAll(`DESCRIBE "${viewName}"`);
    await schemaReader.readAll();
    schemaRows = schemaReader.getRowObjectsJS() as Array<{
      column_name: string;
      column_type: string;
    }>;
  }

  // Convert to SimpleSchema format
  const columns: SimpleColumn[] = schemaRows.map((row) => ({
    columnName: row.column_name,
    columnType: row.column_type,
  }));

  const table: SimpleTable = {
    tableName: opts.viewName,
    columns,
  };

  const schema: SimpleSchema = {
    databaseName: 'google_sheet',
    schemaName: 'google_sheet',
    tables: [table],
  };

  return schema;
};

/**
 * Extract schemas for multiple views in parallel
 */
export async function extractSchemasParallel(
  connection: Connection,
  viewNames: string[],
  concurrency: number = 4,
): Promise<Map<string, SimpleSchema>> {
  // Simple concurrency control implementation
  const processWithConcurrency = async <T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 4,
  ): Promise<R[]> => {
    const results: R[] = [];
    let executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = processor(item)
        .then((result) => {
          results.push(result);
        })
        .catch((error) => {
          results.push(error as unknown as R);
        });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing = executing.filter((p) => p !== undefined);
      }
    }

    await Promise.all(executing);
    return results;
  };

  const schemas = await processWithConcurrency(
    viewNames,
    async (viewName) => {
      const schema = await extractSchema({ connection, viewName });
      return [viewName, schema] as [string, SimpleSchema];
    },
    concurrency,
  );

  return new Map(schemas);
}
