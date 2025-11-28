import type { SimpleSchema, Table, Column } from '@qwery/domain/entities';

export interface ExtractSchemaOptions {
  dbPath: string;
  viewName?: string;
}

export const extractSchema = async (
  opts: ExtractSchemaOptions,
): Promise<SimpleSchema> => {
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const instance = await DuckDBInstance.create(opts.dbPath);
  const conn = await instance.connect();

  try {
    // Get schema information using DESCRIBE on the view
    const viewName = (opts.viewName || 'my_sheet').replace(/"/g, '""');
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
      tableName: opts.viewName || 'my_sheet',
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
