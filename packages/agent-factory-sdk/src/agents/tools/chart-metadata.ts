import type { QueryResults } from './generate-chart';

export type ChartMetadata = {
  columns: string[];
  rowCount: number;
};

export function buildChartMetadata(queryResults: QueryResults): ChartMetadata {
  return {
    columns: queryResults.columns,
    rowCount: queryResults.rows.length,
  };
}

