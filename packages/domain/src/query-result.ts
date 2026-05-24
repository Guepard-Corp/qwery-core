export type QueryRows = Record<string, unknown>[];

export interface QueryResult {
  columns: string[];
  rows: QueryRows;
  rowCount: number;
  durationMs: number;
}

export interface QuerySchema {
  columns: Array<{ name: string; type: string }>;
}
