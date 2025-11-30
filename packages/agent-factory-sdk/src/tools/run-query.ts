export interface RunQueryOptions {
  dbPath: string;
  query: string;
}

export interface RunQueryResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

/**
 * Recursively converts BigInt values to numbers for JSON serialization
 */
const convertBigInt = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    // Convert BigInt to number if it's within safe integer range, otherwise to string
    if (value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
      return Number(value);
    }
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(convertBigInt);
  }
  if (value && typeof value === 'object') {
    const converted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      converted[key] = convertBigInt(val);
    }
    return converted;
  }
  return value;
};

export const runQuery = async (
  opts: RunQueryOptions,
): Promise<RunQueryResult> => {
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const instance = await DuckDBInstance.create(opts.dbPath);
  const conn = await instance.connect();

  try {
    // Execute the query on the view
    const resultReader = await conn.runAndReadAll(opts.query);
    await resultReader.readAll();
    const rows = resultReader.getRowObjectsJS() as Array<
      Record<string, unknown>
    >;
    const columnNames = resultReader.columnNames();

    // Convert BigInt values to numbers/strings for JSON serialization
    const convertedRows = rows.map(
      (row) => convertBigInt(row) as Record<string, unknown>,
    );

    return {
      columns: columnNames,
      rows: convertedRows,
    };
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
};
