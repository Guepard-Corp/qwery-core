/**
 * Extract table references from a SQL query
 * Handles quoted and unquoted identifiers, multi-part table paths
 */
export function extractTablePathsFromQuery(query: string): string[] {
  const tablePaths: string[] = [];

  // Patterns to match table references with better handling of:
  // - Quoted identifiers: "database"."schema"."table" or 'database'.'schema'.'table'
  // - Unquoted identifiers: database.schema.table
  // - Mixed: "database".schema."table"
  // FROM/JOIN/UPDATE/INSERT INTO/DELETE FROM patterns

  // Improved regex that handles quoted identifiers properly
  // Matches: identifier or "quoted" or 'quoted' (can be mixed)
  const identifierPattern = '(?:"[^"]+"|\'[^\']+\'|[a-zA-Z_][a-zA-Z0-9_]*)';
  const tablePathPattern = `${identifierPattern}(?:\\.${identifierPattern}){0,2}`;

  const patterns = [
    new RegExp(`\\bFROM\\s+(${tablePathPattern})`, 'gi'),
    new RegExp(`\\bJOIN\\s+(${tablePathPattern})`, 'gi'),
    new RegExp(`\\bUPDATE\\s+(${tablePathPattern})`, 'gi'),
    new RegExp(`\\bINSERT\\s+INTO\\s+(${tablePathPattern})`, 'gi'),
    new RegExp(`\\bDELETE\\s+FROM\\s+(${tablePathPattern})`, 'gi'),
  ];

  for (const pattern of patterns) {
    let match;
    // Reset lastIndex to avoid issues with global regex
    pattern.lastIndex = 0;
    while ((match = pattern.exec(query)) !== null) {
      const tablePath = match[1]?.trim();
      if (
        tablePath &&
        !tablePath.startsWith('(') &&
        !tablePath.toLowerCase().startsWith('select') &&
        !tablePaths.includes(tablePath)
      ) {
        // Normalize the path: remove quotes and convert to lowercase for comparison
        // But preserve the structure (database.schema.table)
        const cleanPath = tablePath
          .replace(/"([^"]+)"/g, '$1') // Remove double quotes
          .replace(/'([^']+)'/g, '$1') // Remove single quotes
          .trim();

        if (cleanPath && !tablePaths.includes(cleanPath)) {
          tablePaths.push(cleanPath);
        }
      }
    }
  }

  return tablePaths;
}
