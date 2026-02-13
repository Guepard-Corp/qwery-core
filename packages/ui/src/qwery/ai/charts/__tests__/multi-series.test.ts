import { describe, expect, it } from 'vitest';
import { resolveChartKeys } from '../chart-utils';

describe('multi-series helpers', () => {
  it('resolveChartKeys picks reasonable defaults for bar/line', () => {
    const data = [{ date: '2024-01', revenue: 10, costs: 5 }];

    const resolved = resolveChartKeys(
      data,
      { xKey: 'date', yKey: 'revenue' },
      'line',
    ) as { xKey: string; yKey: string };

    expect(resolved.xKey).toBe('date');
    expect(resolved.yKey).toBe('revenue');
  });

  it('resolveChartKeys infers keys for pie', () => {
    const data = [{ category: 'A', value: 10 }];

    const resolved = resolveChartKeys(data, {}, 'pie') as {
      nameKey: string;
      valueKey: string;
    };

    expect(resolved.nameKey).toBe('category');
    expect(resolved.valueKey).toBe('value');
  });
});
