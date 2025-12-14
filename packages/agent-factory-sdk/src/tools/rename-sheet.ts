import type { AbstractQueryEngine } from '@qwery/domain/ports';

export interface RenameSheetOptions {
  oldSheetName: string;
  newSheetName: string;
  queryEngine: AbstractQueryEngine;
}

export interface RenameSheetResult {
  oldSheetName: string;
  newSheetName: string;
  message: string;
}

export const renameSheet = async (
  opts: RenameSheetOptions,
): Promise<RenameSheetResult> => {
  const { oldSheetName, newSheetName, queryEngine } = opts;

  // Validate inputs
  if (!oldSheetName || !newSheetName) {
    throw new Error('Both oldSheetName and newSheetName are required');
  }

  if (oldSheetName === newSheetName) {
    throw new Error('Old and new sheet names cannot be the same');
  }

  if (!queryEngine) {
    throw new Error('Query engine is required');
  }

  const escapedOldName = oldSheetName.replace(/"/g, '""');
  const escapedNewName = newSheetName.replace(/"/g, '""');

  // Check if old view exists
  try {
    await queryEngine.query(`SELECT 1 FROM "${escapedOldName}" LIMIT 1`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      errorMsg.includes('does not exist') ||
      errorMsg.includes('not found') ||
      errorMsg.includes('Catalog Error')
    ) {
      throw new Error(`View "${oldSheetName}" does not exist. Cannot rename.`);
    }
    throw error;
  }

  // Check if new name already exists
  try {
    await queryEngine.query(`SELECT 1 FROM "${escapedNewName}" LIMIT 1`);
    throw new Error(
      `View "${newSheetName}" already exists. Cannot rename to an existing name.`,
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
  await queryEngine.query(
    `ALTER VIEW "${escapedOldName}" RENAME TO "${escapedNewName}"`,
  );

  return {
    oldSheetName,
    newSheetName,
    message: `Successfully renamed view "${oldSheetName}" to "${newSheetName}"`,
  };
};
