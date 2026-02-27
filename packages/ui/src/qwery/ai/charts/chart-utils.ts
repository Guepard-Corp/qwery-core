/**
 * Chart color utilities
 * Chart generation now uses direct hex colors, so no CSS variable resolution needed
 */

import type { ChartType } from './chart-type-selector';

// Default color palette for fallback
export const DEFAULT_CHART_COLORS = [
  '#8884d8', // Blue
  '#82ca9d', // Green
  '#ffc658', // Yellow
  '#ff7c7c', // Red
  '#8dd1e1', // Cyan
];

/**
 * Gets colors array, using defaults if empty (only for pie charts)
 * Bar and line charts should use colors directly from config without fallback
 */
export function getColors(colors: string[]): string[] {
  return colors.length > 0 ? colors : DEFAULT_CHART_COLORS;
}

/**
 * Gets colors for bar/line charts without default fallback
 */
export function getColorsForBarLine(colors: string[]): string[] {
  return colors;
}

export type AxisUnit = 'auto' | 'raw' | 'short';

/**
 * Format numeric axis ticks using K/M/B suffixes.
 * Keeps small values as plain localized numbers.
 */
export function formatAxisTick(
  value: number,
  unit: AxisUnit = 'short',
): string {
  if (!Number.isFinite(value)) {
    return '';
  }

  if (unit === 'raw') {
    return value.toLocaleString();
  }

  const abs = Math.abs(value);

  if (abs >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }

  if (abs >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }

  if (abs >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }

  return value.toLocaleString();
}

/**
 * Format date-like values for the X axis.
 * Handles Date instances, ISO strings, and timestamps.
 */
export function formatDateAxisTick(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString(undefined, {
      month: 'short',
      year: '2-digit',
    });
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromTs = new Date(value);
    if (!Number.isNaN(fromTs.getTime())) {
      return fromTs.toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit',
      });
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit',
      });
    }
    return trimmed;
  }

  return '';
}

type KeyConfig = {
  xKey?: string;
  yKey?: string;
  nameKey?: string;
  valueKey?: string;
};

type ResolvedXY = { xKey: string; yKey: string };
type ResolvedNameValue = { nameKey: string; valueKey: string };

/**
 * Heuristic key resolver used by all chart types.
 * Tries explicit keys first, then falls back to best-effort guesses from data.
 */
export function resolveChartKeys(
  data: Array<Record<string, unknown>>,
  config: KeyConfig,
  chartType: ChartType,
): ResolvedXY | ResolvedNameValue {
  const firstRow = data[0] ?? {};
  const allKeys = Object.keys(firstRow);

  const isEmpty = allKeys.length === 0;

  const ensureKey = (preferred?: string, fallbacks: string[] = []): string => {
    if (!isEmpty && preferred && preferred in firstRow) {
      return preferred;
    }

    const lowerKeyMap = new Map<string, string>();
    for (const key of allKeys) {
      lowerKeyMap.set(key.toLowerCase(), key);
    }

    for (const fb of fallbacks) {
      const direct = lowerKeyMap.get(fb.toLowerCase());
      if (direct) {
        return direct;
      }
    }

    return allKeys[0] ?? preferred ?? fallbacks[0] ?? 'value';
  };

  if (chartType === 'pie') {
    const nameKey = ensureKey(config.nameKey, ['name', 'category', 'label']);
    const valueKey = ensureKey(config.valueKey, [
      'value',
      'count',
      'amount',
      'total',
      'sum',
    ]);
    return { nameKey, valueKey };
  }

  const xKey = ensureKey(config.xKey, [
    'name',
    'category',
    'label',
    'date',
    'time',
    'timestamp',
  ]);

  const yKey = ensureKey(config.yKey, [
    'value',
    'count',
    'amount',
    'total',
    'sum',
    'avg',
    'mean',
  ]);

  if (xKey === yKey && allKeys.length > 1) {
    const alt = allKeys.find((k) => k !== xKey);
    if (alt) {
      return { xKey, yKey: alt };
    }
  }

  return { xKey, yKey };
}
