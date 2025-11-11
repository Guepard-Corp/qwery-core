export interface ResultStat {
  rowsAffected: number;
  rowsRead: number | null;
  rowsWritten: number | null;
  queryDurationMs: number | null;
}

declare enum ColumnType {
  TEXT = 1,
  INTEGER = 2,
  REAL = 3,
  BLOB = 4,
}

export interface ColumnHeader {
  /**
   * The key of row data that this column represents.
   */
  name: string;
  /**
   * The display name of the column. This is the name that should be used when displaying the column to the user.
   */
  displayName: string;
  /**
   * The original type of the column returned from database driver.
   */
  originalType: string | null;
  /**
   * Provide hint to the client on how to render the column.
   * If not provided, the client should infer the type from the data.
   */
  type?: ColumnType;
  /**
   * Database name or schema name
   */
  schema?: string;
  /**
   * The actual table name
   */
  table?: string;
  /**
   * The original column name returned from database driver.
   */
  originalName?: string;
  /**
   * Indicate if this column is a primary key.
   */
  primaryKey?: boolean;
  /**
   * The column id in the table. This is useful for Postgres.
   */
  columnId?: number;
  /**
   * The table id in the database. This is useful for Postgres.
   */
  tableId?: number;
}

export interface DatasourceResultStat {
  rowsAffected: number;
  rowsRead: number | null;
  rowsWritten: number | null;
  queryDurationMs: number | null;
}

export type DatasourceRow = Record<string, unknown>;
export type DatasourceHeader = ColumnHeader;

export interface DatasourceResultSet {
  rows: DatasourceRow[];
  headers: DatasourceHeader[];
  stat: DatasourceResultStat;
  lastInsertRowid?: number;
}
