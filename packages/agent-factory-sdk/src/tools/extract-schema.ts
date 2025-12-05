import type { SimpleSchema, Table, Column } from '@qwery/domain/entities';

export interface ExtractSchemaOptions {
  dbPath: string;
  viewName?: string;
  allowTempTables?: boolean; // Allow temp tables during creation process
}

export const extractSchema = async (
  opts: ExtractSchemaOptions,
): Promise<SimpleSchema> => {
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const instance = await DuckDBInstance.create(opts.dbPath);
  const conn = await instance.connect();

  // Import validation function
  const { isSystemOrTempTable, validateTableExists } = await import(
    './view-registry'
  );

  try {
    // Validate view exists and is not temp if viewName is provided
    // But allow temp tables during creation process (allowTempTables = true)
    if (opts.viewName) {
      if (!opts.allowTempTables && isSystemOrTempTable(opts.viewName)) {
        throw new Error(
          `Cannot extract schema from system/temp table: ${opts.viewName}`,
        );
      }

      const exists = await validateTableExists(opts.dbPath, opts.viewName);
      if (!exists) {
        throw new Error(`View '${opts.viewName}' does not exist in database`);
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

      // Import validation function
      const { isSystemOrTempTable } = await import('./view-registry');

      // Filter out known system views and temp tables - only return views that look like user-created views
      const views = allViews.filter((v) => {
        const name = v.table_name;
        // Exclude system/temp tables
        if (isSystemOrTempTable(name)) {
          return false;
        }
        // Exclude views with dots (schema-qualified) or special characters
        const nameLower = name.toLowerCase();
        if (
          nameLower.includes('.') ||
          nameLower.includes('$') ||
          nameLower.includes('#')
        ) {
          return false;
        }
        return true;
      });

      // If we still have too many views, try to identify user-created ones
      // by checking if they match common naming patterns (e.g., sheet_*, my_*, etc.)
      // For now, just return all filtered views and let the caller handle it

      const tables: Table[] = [];
      for (const view of views) {
        const viewName = view.table_name.replace(/"/g, '""');
        const schemaReader = await conn.runAndReadAll(`DESCRIBE "${viewName}"`);
        await schemaReader.readAll();
        const schemaRows = schemaReader.getRowObjectsJS() as Array<{
          column_name: string;
          column_type: string;
        }>;

        const columns: Column[] = schemaRows.map((row) => ({
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

    // Get schema information using DESCRIBE on the specific view
    const viewName = opts.viewName.replace(/"/g, '""');
    const schemaReader = await conn.runAndReadAll(`DESCRIBE "${viewName}"`);
    await schemaReader.readAll();
    const schemaRows = schemaReader.getRowObjectsJS() as Array<{
      column_name: string;
      column_type: string;
    }>;

    // Convert to SimpleSchema format
    const columns: Column[] = schemaRows.map((row) => ({
      columnName: row.column_name,
      columnType: row.column_type,
    }));

    const table: Table = {
      tableName: opts.viewName,
      columns,
    };

    const schema: SimpleSchema = {
      databaseName: 'google_sheet',
      schemaName: 'google_sheet',
      tables: [table],
    };

    return schema;
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
};

/**
 * Extract schemas for multiple views in parallel
 */
export async function extractSchemasParallel(
  dbPath: string,
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
      const schema = await extractSchema({ dbPath, viewName });
      return [viewName, schema] as [string, SimpleSchema];
    },
    concurrency,
  );

  return new Map(schemas);
}
