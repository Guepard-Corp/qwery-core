import type { AbstractQueryEngine } from '@qwery/domain/ports';

export interface DeleteSheetOptions {
  sheetNames: string[];
  queryEngine: AbstractQueryEngine;
}

export interface DeleteSheetResult {
  deletedSheets: string[];
  failedSheets: Array<{ sheetName: string; error: string }>;
  message: string;
}

export const deleteSheet = async (
  opts: DeleteSheetOptions,
): Promise<DeleteSheetResult> => {
  const { sheetNames, queryEngine } = opts;

  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('At least one sheet name is required');
  }

  if (!queryEngine) {
    throw new Error('Query engine is required');
  }

  const deletedSheets: string[] = [];
  const failedSheets: Array<{ sheetName: string; error: string }> = [];

  // Delete each sheet using queryEngine
  for (const sheetName of sheetNames) {
    try {
      const escapedName = sheetName.replace(/"/g, '""');
      // Try to drop as VIEW first, then as TABLE
      // DROP VIEW IF EXISTS and DROP TABLE IF EXISTS won't error if the object doesn't exist
      await queryEngine.query(`DROP VIEW IF EXISTS "${escapedName}"`);
      await queryEngine.query(`DROP TABLE IF EXISTS "${escapedName}"`);
      deletedSheets.push(sheetName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      failedSheets.push({ sheetName, error: errorMsg });
    }
  }

  const successCount = deletedSheets.length;
  const failCount = failedSheets.length;

  let message: string;
  if (successCount === sheetNames.length) {
    message = `Successfully deleted ${successCount} sheet(s): ${deletedSheets.join(', ')}`;
  } else if (successCount > 0) {
    message = `Deleted ${successCount} sheet(s): ${deletedSheets.join(', ')}. Failed to delete ${failCount} sheet(s): ${failedSheets.map((f) => f.sheetName).join(', ')}`;
  } else {
    message = `Failed to delete all ${failCount} sheet(s)`;
  }

  return {
    deletedSheets,
    failedSheets,
    message,
  };
};
