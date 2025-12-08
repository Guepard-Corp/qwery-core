export interface RenameSheetOptions {
  dbPath: string;
  oldSheetName: string;
  newSheetName: string;
}

export interface RenameSheetResult {
  oldSheetName: string;
  newSheetName: string;
  message: string;
}

/**
 * Renames a sheet/view in the DuckDB database.
 * This is useful when you want to give a sheet a more meaningful name based on its content.
 * Uses shared instance manager for MVCC-optimized operations
 */
export const renameSheet = async (
  opts: RenameSheetOptions,
): Promise<RenameSheetResult> => {
  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  const { DuckDBInstance } = await import('@duckdb/node-api');

  const dbDir = dirname(opts.dbPath);
  await mkdir(dbDir, { recursive: true });

  const instance = await DuckDBInstance.create(opts.dbPath);
  const conn = await instance.connect();

  try {
    // Sanitize names for SQL
    const oldName = opts.oldSheetName.replace(/"/g, '""');
    const newName = opts.newSheetName.replace(/"/g, '""');

    // Check if old view exists
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'main' AND table_name = '${oldName}'
    `;
    const checkResult = await conn.runAndReadAll(checkQuery);
    await checkResult.readAll();
    const rows = checkResult.getRowObjectsJS();

    if (rows.length === 0) {
      throw new Error(
        `View "${opts.oldSheetName}" does not exist. Cannot rename.`,
      );
    }

    // Check if new name already exists
    const checkNewQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'main' AND table_name = '${newName}'
    `;
    const checkNewResult = await conn.runAndReadAll(checkNewQuery);
    await checkNewResult.readAll();
    const newRows = checkNewResult.getRowObjectsJS();

    if (newRows.length > 0) {
      throw new Error(
        `View "${opts.newSheetName}" already exists. Cannot rename to an existing name.`,
      );
    }

    // Rename the view using ALTER VIEW
    await conn.run(`ALTER VIEW "${oldName}" RENAME TO "${newName}"`);

    return {
      oldSheetName: opts.oldSheetName,
      newSheetName: opts.newSheetName,
      message: `Successfully renamed view "${opts.oldSheetName}" to "${opts.newSheetName}"`,
    };
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
};

