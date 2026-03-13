import type { ChartType } from './types/chart.types';
import type { QueryResults } from './tools/generate-chart';
import { generateChart } from './tools/generate-chart';

export type ChartSubagentInput = {
  queryResults: QueryResults;
  sqlQuery: string;
  userInput: string;
  chartType?: ChartType;
};

export type ChartSubagentOutput = Awaited<ReturnType<typeof generateChart>>;

export async function runChartSubagent(
  input: ChartSubagentInput,
): Promise<ChartSubagentOutput> {
  return generateChart(input);
}
