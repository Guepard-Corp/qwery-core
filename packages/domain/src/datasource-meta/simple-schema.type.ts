/**
 * Simplified schema representation used by agent-factory-sdk
 * This is a lightweight version of the full schema metadata
 */
export interface SimpleColumn {
  columnName: string;
  columnType: string;
}

export interface SimpleTable {
  tableName: string;
  columns: SimpleColumn[];
}

export interface SimpleSchema {
  databaseName: string;
  schemaName: string;
  tables: SimpleTable[];
}
