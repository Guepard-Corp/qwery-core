import { describe, expect, it } from 'vitest';
import {
  coerceNumericValue,
  parseDateValue,
  sanitizeDataRow,
  transformQueryResultsToChartData,
} from '../chart-data-transformer';

describe('chart-data-transformer', () => {
  it('coerces numeric values correctly', () => {
    expect(coerceNumericValue(42)).toBe(42);
    expect(coerceNumericValue('42')).toBe(42);
    expect(coerceNumericValue('  3.14 ')).toBeCloseTo(3.14);
    expect(coerceNumericValue('foo')).toBeNull();
    expect(coerceNumericValue(null)).toBeNull();
    expect(coerceNumericValue(undefined)).toBeUndefined();
  });

  it('parses date values correctly', () => {
    const iso = parseDateValue('2024-01-01T00:00:00Z');
    expect(typeof iso).toBe('string');
    expect(String(iso)).toContain('2024-01-01');

    const fromTimestamp = parseDateValue(1_700_000_000_000);
    expect(typeof fromTimestamp).toBe('string');

    const fallback = parseDateValue({}, 5);
    expect(fallback).toBe(5);
  });

  it('sanitizes data rows', () => {
    const row = {
      a: undefined,
      b: {},
      c: 'ok',
    };
    const sanitized = sanitizeDataRow(row);
    expect(sanitized.a).toBeNull();
    expect(sanitized.b).toBeNull();
    expect(sanitized.c).toBe('ok');
  });

  it('transforms query results and detects numeric/date columns', () => {
    const queryResults = {
      columns: ['date', 'value', 'label'],
      rows: [
        { date: '2024-01-01', value: '10', label: 'A' },
        { date: '2024-01-02', value: '20', label: 'B' },
      ],
    };

    const result = transformQueryResultsToChartData(queryResults);

    expect(result.dateColumns).toContain('date');
    expect(result.numericColumns).toContain('value');
    expect(result.transformedData).toHaveLength(2);
    expect(result.transformedData[0].value).toBe(10);
  });
});
