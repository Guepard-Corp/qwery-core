import type { ChartType } from '../types/chart.types';
import type { QueryResults } from './generate-chart';

type ChartEvalConfig = {
  xKey?: string;
  yKey?: string;
  nameKey?: string;
  valueKey?: string;
};

function guessCategoryKey(columns: string[]): string | undefined {
  return (
    columns.find((key) => {
      const lower = key.toLowerCase();
      return (
        lower.includes('name') ||
        lower.includes('category') ||
        lower.includes('label')
      );
    }) ?? columns[0]
  );
}

function guessValueKey(columns: string[], excludeKey?: string): string | undefined {
  return (
    columns.find((key) => {
      if (excludeKey && key === excludeKey) return false;
      const lower = key.toLowerCase();
      return (
        lower.includes('value') ||
        lower.includes('count') ||
        lower.includes('amount')
      );
    }) ??
    columns.find((key) => key !== excludeKey) ??
    columns[0]
  );
}

export function evaluateChartData(
  chartType: ChartType,
  queryResults: QueryResults,
  config: ChartEvalConfig,
): Array<Record<string, unknown>> {
  const { rows, columns } = queryResults;
  if (!rows || rows.length === 0) {
    return [];
  }

  if (chartType === 'bar' || chartType === 'line') {
    let xKey = config.xKey;
    let yKey = config.yKey;

    if (!xKey || !yKey) {
      const guessedX = guessCategoryKey(columns);
      const guessedY = guessValueKey(columns, guessedX);
      xKey = xKey ?? guessedX;
      yKey = yKey ?? guessedY;
    }

    if (!xKey || !yKey) {
      return [];
    }

    return rows.map((row) => {
      const record: Record<string, unknown> = {};
      const typedRow = row as Record<string, unknown>;
      record[xKey as string] = typedRow[xKey];
      record[yKey as string] = typedRow[yKey];
      return record;
    });
  }

  if (chartType === 'pie') {
    let nameKey = config.nameKey;
    let valueKey = config.valueKey;

    if (!nameKey || !valueKey) {
      const guessedName = guessCategoryKey(columns);
      const guessedValue = guessValueKey(columns, guessedName);
      nameKey = nameKey ?? guessedName;
      valueKey = valueKey ?? guessedValue;
    }

    if (!nameKey || !valueKey) {
      return [];
    }

    return rows.map((row) => {
      const record: Record<string, unknown> = {};
      const typedRow = row as Record<string, unknown>;
      record[nameKey as string] = typedRow[nameKey];
      record[valueKey as string] = typedRow[valueKey];
      return record;
    });
  }

  return [];
}

