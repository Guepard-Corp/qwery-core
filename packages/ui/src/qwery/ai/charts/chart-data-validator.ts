/**
 * Lightweight client-side chart data validation and sanitization utilities.
 * These run on already-generated chart configs to make rendering more robust.
 */

type Primitive = string | number | null | undefined;

export type ChartDataRow = Record<string, Primitive>;

/**
 * Coerces a value to a number where possible.
 * Returns null when coercion fails.
 */
export function coerceNumeric(value: Primitive): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return !Number.isNaN(parsed) && Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/**
 * Normalizes undefined to null and collapses empty objects to null.
 */
export function sanitizeChartDataRow(
  row: Record<string, unknown>,
): ChartDataRow {
  const result: ChartDataRow = {};

  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) {
      result[key] = null;
      continue;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      Object.keys(value as object).length === 0
    ) {
      result[key] = null;
      continue;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      value === null
    ) {
      result[key] = value;
      continue;
    }

    result[key] = String(value);
  }

  return result;
}

/**
 * Ensures that numeric keys are coerced to numbers where possible.
 */
export function ensureNumericValues(
  data: Array<Record<string, unknown>>,
  numericKeys: string[],
): ChartDataRow[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((row) => {
    const base = sanitizeChartDataRow(row);
    const result: ChartDataRow = { ...base };

    for (const key of numericKeys) {
      if (key in base) {
        result[key] = coerceNumeric(base[key]);
      }
    }

    return result;
  });
}

/**
 * Basic structural validation to guard against obviously bad data.
 */
export function validateChartData(
  data: Array<Record<string, unknown>> | undefined | null,
): { valid: boolean; reason?: string } {
  if (!data || !Array.isArray(data)) {
    return { valid: false, reason: 'Chart data is not an array' };
  }

  if (data.length === 0) {
    return { valid: false, reason: 'Chart data is empty' };
  }

  if (typeof data[0] !== 'object' || data[0] === null) {
    return { valid: false, reason: 'Chart data rows must be objects' };
  }

  return { valid: true };
}
