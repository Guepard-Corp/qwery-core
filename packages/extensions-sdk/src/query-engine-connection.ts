import type { DriverContext } from './types';

export interface QueryResultReader {
  readAll(): Promise<void>;
  getRowObjectsJS(): Array<Record<string, unknown>>;
  columnNames(): string[];
  columnTypes?(): unknown[];
}

export interface QueryEngineConnection {
  run(sql: string): Promise<void>;
  runAndReadAll(sql: string): Promise<QueryResultReader>;
}

export function isQueryEngineConnection(
  conn: unknown,
): conn is QueryEngineConnection {
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

export function getQueryEngineConnection(
  context: DriverContext,
): QueryEngineConnection | null {
  if (isQueryEngineConnection(context.queryEngineConnection)) {
    return context.queryEngineConnection;
  }
  return null;
}
