import type { QueryResults } from './generate-chart';

/**
 * Coerces a value to a number if possible.
 * Handles string numbers, null, undefined, and actual numbers.
 */
export function coerceNumericValue(value: unknown): number | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }

    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

/**
 * Parses date values from various formats.
 * Handles empty objects {}, date strings, timestamps, and Date objects.
 */
export function parseDateValue(
  value: unknown,
  fallbackIndex?: number,
): string | number | null {
  if (value === null || value === undefined) {
    return fallbackIndex !== undefined ? fallbackIndex : null;
  }

  if (typeof value === 'object' && value !== null) {
    if (Object.keys(value as object).length === 0) {
      return fallbackIndex !== undefined ? fallbackIndex : null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (
      'toISOString' in value &&
      typeof (value as Date).toISOString === 'function'
    ) {
      return (value as Date).toISOString();
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return fallbackIndex !== undefined ? fallbackIndex : null;
    }

    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }

    return trimmed;
  }

  if (typeof value === 'number') {
    // Heuristic: treat big integers as timestamps
    if (value > 1_000_000_000_000) {
      return new Date(value).toISOString();
    }
    return value;
  }

  return fallbackIndex !== undefined ? fallbackIndex : null;
}

/**
 * Sanitizes a data row by cleaning nulls, undefined, and empty objects.
 */
export function sanitizeDataRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) {
      sanitized[key] = null;
      continue;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      Object.keys(value as object).length === 0
    ) {
      sanitized[key] = null;
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Detects if a column contains numeric data.
 */
function isNumericColumn(
  rows: Array<Record<string, unknown>>,
  column: string,
): boolean {
  if (rows.length === 0) {
    return false;
  }

  let numericCount = 0;
  const sampleSize = Math.min(rows.length, 10);

  for (let i = 0; i < sampleSize; i += 1) {
    const value = rows[i]?.[column];
    const coerced = coerceNumericValue(value);
    if (coerced !== null && coerced !== undefined) {
      numericCount += 1;
    }
  }

  return numericCount >= sampleSize * 0.7;
}

/**
 * Detects if a column contains date/time data.
 */
function isDateColumn(
  rows: Array<Record<string, unknown>>,
  column: string,
): boolean {
  if (rows.length === 0) {
    return false;
  }

  const sampleSize = Math.min(rows.length, 10);
  let dateLikeCount = 0;

  for (let i = 0; i < sampleSize; i += 1) {
    const value = rows[i]?.[column];
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'object' &&
        value !== null &&
        Object.keys(value as object).length === 0)
    ) {
      continue;
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        dateLikeCount += 1;
      }
    } else if (value instanceof Date) {
      dateLikeCount += 1;
    }
  }

  return dateLikeCount >= sampleSize * 0.5;
}

/**
 * Transforms query results to chart-ready data format.
 * - Coerces numeric strings to numbers
 * - Handles date objects and strings
 * - Sanitizes null/undefined values
 * - Provides type information for multi-series detection
 */
export function transformQueryResultsToChartData(queryResults: QueryResults): {
  transformedData: Array<Record<string, unknown>>;
  numericColumns: string[];
  dateColumns: string[];
} {
  const { rows, columns } = queryResults;

  if (rows.length === 0) {
    return {
      transformedData: [],
      numericColumns: [],
      dateColumns: [],
    };
  }

  const numericColumns: string[] = [];
  const dateColumns: string[] = [];

  for (const column of columns) {
    if (isDateColumn(rows, column)) {
      dateColumns.push(column);
    } else if (isNumericColumn(rows, column)) {
      numericColumns.push(column);
    }
  }

  const transformedData = rows.map((row, index) => {
    const sanitized = sanitizeDataRow(row);
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(sanitized)) {
      if (dateColumns.includes(key)) {
        const parsed = parseDateValue(value, index);
        transformed[key] = parsed;
      } else if (numericColumns.includes(key)) {
        const coerced = coerceNumericValue(value);
        transformed[key] = coerced ?? null;
      } else {
        transformed[key] = value;
      }
    }

    return transformed;
  });

  return {
    transformedData,
    numericColumns,
    dateColumns,
  };
}

/**
 * Suggests multi-series configuration based on query results.
 * Returns array of series configs if multiple numeric columns are detected.
 */
export function suggestMultiSeriesConfig(
  queryResults: QueryResults,
  excludeKeys: string[] = [],
): Array<{ dataKey: string; label: string }> | null {
  const { numericColumns } = transformQueryResultsToChartData(queryResults);
  const availableColumns = numericColumns.filter(
    (col) => !excludeKeys.includes(col),
  );

  if (availableColumns.length < 2) {
    return null;
  }

  return availableColumns.map((col) => ({
    dataKey: col,
    label: col.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
  }));
}
