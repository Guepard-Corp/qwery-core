const convertToCsvLink = (message: string) => {
  const match = message.match(
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
  );
  if (!match) return message;
  const spreadsheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
};

export interface GSheetToDuckDbOptions {
  dbPath: string;
  sharedLink: string;
  viewName: string;
}

export const gsheetToDuckdb = async (
  opts: GSheetToDuckDbOptions,
): Promise<string> => {
  const csvLink = convertToCsvLink(opts.sharedLink);

  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');

  // Ensure directory exists
  const dbDir = dirname(opts.dbPath);
  await mkdir(dbDir, { recursive: true });

  // Create DuckDB database on disk
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const instance = await DuckDBInstance.create(opts.dbPath);
  const conn = await instance.connect();

  try {
    const escapedUrl = csvLink.replace(/'/g, "''");
    const escapedViewName = opts.viewName.replace(/"/g, '""');

    // Create or replace view directly from the CSV URL
    await conn.run(`
      CREATE OR REPLACE VIEW "${escapedViewName}" AS
      SELECT * FROM read_csv_auto('${escapedUrl}')
    `);

    return `Successfully created view '${opts.viewName}' from Google Sheet in database at ${opts.dbPath}`;
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
};
