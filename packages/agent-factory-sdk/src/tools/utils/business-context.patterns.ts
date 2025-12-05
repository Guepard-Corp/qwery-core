import type { SimpleSchema } from '@qwery/domain/entities';
import type { DataPatterns } from '../types/business-context.types';

/**
 * Extract data patterns from actual data (sample first 100 rows)
 */
export async function extractDataPatterns(
  dbPath: string,
  viewName: string,
  schema: SimpleSchema,
): Promise<DataPatterns> {
  const patterns: DataPatterns = {
    enums: new Map(),
    ranges: new Map(),
    patterns: new Map(),
    uniqueness: [],
  };

  try {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      const escapedViewName = viewName.replace(/"/g, '""');

      // Sample first 100 rows
      const sampleReader = await conn.runAndReadAll(
        `SELECT * FROM "${escapedViewName}" LIMIT 100`,
      );
      await sampleReader.readAll();
      const rows = sampleReader.getRowObjectsJS() as Array<
        Record<string, unknown>
      >;
      const columnNames = sampleReader.columnNames();

      if (rows.length === 0) {
        return patterns;
      }

      // Analyze each column
      for (const columnName of columnNames) {
        const column = schema.tables[0]?.columns.find(
          (c) => c.columnName === columnName,
        );
        if (!column) continue;

        const values = rows
          .map((row) => row[columnName])
          .filter((v) => v !== null && v !== undefined);

        if (values.length === 0) continue;

        // Detect enums (categorical values)
        if (column.columnType.includes('VARCHAR')) {
          const uniqueValues = new Set(values.map(String));
          if (
            uniqueValues.size <= 10 &&
            uniqueValues.size < values.length * 0.5
          ) {
            patterns.enums.set(columnName, Array.from(uniqueValues));
          }

          // Detect patterns (email, phone, etc.)
          const stringValues = values.map(String);
          if (stringValues.some((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
            patterns.patterns.set(columnName, 'email');
          } else if (stringValues.some((v) => /^\d{10,}$/.test(v))) {
            patterns.patterns.set(columnName, 'phone');
          }
        }

        // Detect ranges for numeric columns
        if (
          column.columnType.includes('INTEGER') ||
          column.columnType.includes('DOUBLE') ||
          column.columnType.includes('DECIMAL')
        ) {
          const numericValues = values
            .map((v) => Number(v))
            .filter((n) => !isNaN(n));

          if (numericValues.length > 0) {
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            const avg =
              numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            patterns.ranges.set(columnName, { min, max, avg });
          }
        }

        // Detect uniqueness (all values are unique)
        const uniqueCount = new Set(values).size;
        if (uniqueCount === values.length && values.length > 1) {
          patterns.uniqueness.push(columnName);
        }
      }
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  } catch {
    // If data extraction fails, return empty patterns
    return patterns;
  }

  return patterns;
}
