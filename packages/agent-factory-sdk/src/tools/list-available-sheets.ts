export interface ListAvailableSheetsOptions {
  dbPath: string;
}

export interface AvailableSheet {
  name: string;
  type: 'view' | 'table';
}

export interface ListAvailableSheetsResult {
  sheets: AvailableSheet[];
  message: string;
}

/**
 * Lists all available views and tables in the DuckDB database.
 * This helps users remember which sheets they have registered.
 * Uses shared instance manager for MVCC-optimized operations
 */
export const listAvailableSheets = async (
  opts: ListAvailableSheetsOptions,
): Promise<ListAvailableSheetsResult> => {
  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  const { DuckDBInstance } = await import('@duckdb/node-api');

  const dbDir = dirname(opts.dbPath);
  await mkdir(dbDir, { recursive: true });

  const instance = await DuckDBInstance.create(opts.dbPath);
  const conn = await instance.connect();

  try {
    // Query information_schema to get all tables and views
    const query = `
      SELECT 
        table_name as name,
        table_type as type
      FROM information_schema.tables
      WHERE table_schema = 'main'
      ORDER BY table_name;
    `;

    const resultReader = await conn.runAndReadAll(query);
    await resultReader.readAll();
    const rows = resultReader.getRowObjectsJS() as Array<{
      name: string;
      type: string;
    }>;

    const sheets: AvailableSheet[] = rows.map((row) => ({
      name: row.name,
      type: row.type === 'VIEW' ? 'view' : 'table',
    }));

    let message: string;
    if (sheets.length === 0) {
      message =
        'No sheets are currently registered. Use createDbViewFromSheet to register a Google Sheet.';
    } else {
      const sheetList = sheets
        .map((sheet) => `- ${sheet.name} (${sheet.type})`)
        .join('\n');
      message = `Available sheets (${sheets.length}):\n${sheetList}`;
    }

    return {
      sheets,
      message,
    };
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
};

