import type { QueryResult, QuerySchema } from '../query-result';

/**
 * Compute port — backed by a local SQL/analytics engine (e.g. DuckDB).
 * Used by the application to run queries and inspect output schemas
 * without leaving the local trust zone (ADR #28).
 */
export interface Compute {
  /** Execute SQL and return the result rows locally. */
  runSql(sql: string): Promise<QueryResult>;

  /**
   * Return the output schema of a query without executing it (no row data).
   * Implementations typically use `PREPARE` or equivalent.
   */
  describeSql(sql: string): Promise<QuerySchema>;
}
