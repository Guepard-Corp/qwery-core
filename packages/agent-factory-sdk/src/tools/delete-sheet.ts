export interface DeleteSheetOptions {
  dbPath: string;
  sheetNames: string[];
}

export interface DeleteSheetResult {
  deletedSheets: string[];
  failedSheets: Array<{ sheetName: string; error: string }>;
  message: string;
}

/**
 * Deletes one or more sheets/views from the DuckDB database.
 * This permanently removes the views and all their data.
 * Supports batch deletion of multiple sheets at once.
 * Uses shared instance manager for MVCC-optimized operations
 */
export const deleteSheet = async (
  opts: DeleteSheetOptions,
): Promise<DeleteSheetResult> => {
  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  const { DuckDBInstance } = await import('@duckdb/node-api');

  const dbDir = dirname(opts.dbPath);
  await mkdir(dbDir, { recursive: true });

  const instance = await DuckDBInstance.create(opts.dbPath);
  const conn = await instance.connect();

  const deletedSheets: string[] = [];
  const failedSheets: Array<{ sheetName: string; error: string }> = [];

  try {
    for (const sheetName of opts.sheetNames) {
      try {
        // Sanitize sheet name for SQL
        const sanitizedSheetName = sheetName.replace(/"/g, '""');

        // Check if view exists
        const checkQuery = `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'main' AND table_name = '${sanitizedSheetName}'
        `;
        const checkResult = await conn.runAndReadAll(checkQuery);
        await checkResult.readAll();
        const rows = checkResult.getRowObjectsJS();

        if (rows.length === 0) {
          failedSheets.push({
            sheetName,
            error: `View "${sheetName}" does not exist`,
          });
          continue;
        }

        // Delete the view
        await conn.run(`DROP VIEW IF EXISTS "${sanitizedSheetName}"`);
        deletedSheets.push(sheetName);
      } catch (error) {
        failedSheets.push({
          sheetName,
          error:
            error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Generate message
    let message = '';
    if (deletedSheets.length > 0 && failedSheets.length === 0) {
      if (deletedSheets.length === 1) {
        message = `Successfully deleted view "${deletedSheets[0]}"`;
      } else {
        message = `Successfully deleted ${deletedSheets.length} views: ${deletedSheets.map((s) => `"${s}"`).join(', ')}`;
      }
    } else if (deletedSheets.length > 0 && failedSheets.length > 0) {
      message = `Deleted ${deletedSheets.length} view(s): ${deletedSheets.map((s) => `"${s}"`).join(', ')}. Failed to delete ${failedSheets.length} view(s): ${failedSheets.map((f) => `"${f.sheetName}" (${f.error})`).join(', ')}`;
    } else {
      message = `Failed to delete all views: ${failedSheets.map((f) => `"${f.sheetName}" (${f.error})`).join(', ')}`;
    }

    return {
      deletedSheets,
      failedSheets,
      message,
    };
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
};

