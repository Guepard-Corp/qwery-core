/**
 * Extract table references from a SQL query
 * Simple regex-based extraction for common SQL patterns
 */
export function extractTablePathsFromQuery(query: string): string[] {
  const tablePaths: string[] = [];

  // Patterns to match table references:
  // FROM table_name
  // FROM datasource.schema.table
  // JOIN table_name
  // UPDATE table_name
  // INSERT INTO table_name
  // DELETE FROM table_name

  // Match FROM/JOIN/UPDATE/INSERT INTO/DELETE FROM patterns
  const patterns = [
    /\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
    /\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
    /\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
    /\bINSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
    /\bDELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(query)) !== null) {
      const tablePath = match[1]?.trim();
      if (
        tablePath &&
        !tablePath.startsWith('(') &&
        !tablePaths.includes(tablePath)
      ) {
        // Remove quotes if present
        const cleanPath = tablePath.replace(/^["']|["']$/g, '');
        tablePaths.push(cleanPath);
      }
    }
  }

  return tablePaths;
}
