/**
 * Escapes a value for interpolation inside a SQL **single-quoted** string literal
 * by doubling `'` (SQL standard). Safe for DuckDB, PostgreSQL, SQLite, MySQL with
 * ANSI_QUOTES, and similar engines when you must build SQL as a string.
 *
 * Prefer native parameterized queries / prepared statements when available; this
 * only addresses quote-breaking and basic injection via literal termination.
 */
export function escapeSqlStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Escapes a SQL **double-quoted** identifier (table/column/view name) by doubling `"`.
 */
export function escapeSqlIdentifier(name: string): string {
  return name.replace(/"/g, '""');
}
