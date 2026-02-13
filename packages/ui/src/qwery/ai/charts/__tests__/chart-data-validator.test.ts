import { describe, expect, it } from 'vitest';
import {
  coerceNumeric,
  ensureNumericValues,
  sanitizeChartDataRow,
  validateChartData,
} from '../chart-data-validator';

describe('chart-data-validator', () => {
  it('coerces numeric values', () => {
    expect(coerceNumeric('42')).toBe(42);
    expect(coerceNumeric(' 3.14 ')).toBeCloseTo(3.14);
    expect(coerceNumeric('foo')).toBeNull();
    expect(coerceNumeric(null)).toBeNull();
  });

  it('sanitizes rows', () => {
    const row = sanitizeChartDataRow({
      a: undefined,
      b: {},
      c: 'ok',
    });
    expect(row.a).toBeNull();
    expect(row.b).toBeNull();
    expect(row.c).toBe('ok');
  });

  it('ensures numeric values for specific keys', () => {
    const data = [
      { value: '10', label: 'A' },
      { value: '20', label: 'B' },
    ];
    const numeric = ensureNumericValues(data, ['value']);

    expect(numeric[0].value).toBe(10);
    expect(numeric[1].value).toBe(20);
  });

  it('validates chart data structure', () => {
    expect(validateChartData(null).valid).toBe(false);
    expect(validateChartData([{ x: 1, y: 2 }]).valid).toBe(true);
  });
});
