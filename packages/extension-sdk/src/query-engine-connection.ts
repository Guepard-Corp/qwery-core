import type { ColumnHeader, DatasourceResultSet } from './metadata';
import type { DriverContext } from './types';

/** Result reader returned by `runAndReadAll`. */
export interface QueryResultReader {
  readAll(): Promise<void>;
  getRowObjectsJS(): Array<Record<string, unknown>>;
  columnNames(): string[];
  columnTypes?(): unknown[];
}

/**
 * Connection abstraction the host passes to a driver via `DriverContext.queryEngineConnection`.
 * Mirrors the shape of DuckDB's `Connection` class so existing DuckDB-based drivers work
 * without modification, but is engine-agnostic at the type level.
 */
export interface QueryEngineConnection {
  run(sql: string): Promise<void>;
  runAndReadAll(sql: string): Promise<QueryResultReader>;
}

export function isQueryEngineConnection(conn: unknown): conn is QueryEngineConnection {
  return (
    conn !== null &&
    conn !== undefined &&
    typeof conn === 'object' &&
    'run' in conn &&
    typeof (conn as { run: unknown }).run === 'function' &&
    'runAndReadAll' in conn &&
    typeof (conn as { runAndReadAll: unknown }).runAndReadAll === 'function'
  );
}

export function getQueryEngineConnection(context: DriverContext): QueryEngineConnection | null {
  if (isQueryEngineConnection(context.queryEngineConnection)) {
    return context.queryEngineConnection;
  }
  return null;
}

/**
 * Maps a `QueryResultReader` (already drained via `readAll()`) into the canonical
 * `DatasourceResultSet` shape from `@qwery/domain`. Shared by all query-engine-backed
 * drivers so they return domain-aligned results without duplicating the mapping.
 */
export function resultSetFromReader(reader: QueryResultReader): DatasourceResultSet {
  const rows = reader.getRowObjectsJS();
  const names = reader.columnNames();
  const types = reader.columnTypes?.();
  const columns: ColumnHeader[] = names.map((name, index) => ({
    name,
    displayName: name,
    originalType: types && types[index] != null ? String(types[index]) : null,
  }));
  return {
    rows,
    columns,
    stat: {
      rowsAffected: rows.length,
      rowsRead: rows.length,
      rowsWritten: 0,
      queryDurationMs: null,
    },
  };
}
