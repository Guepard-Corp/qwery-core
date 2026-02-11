import { z } from 'zod';
import { Tool } from './tool';
import { generateChart } from '../agents/tools/generate-chart';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION =
  'Generates a chart configuration JSON for visualization. Takes query results and creates a chart (bar, line, or pie) with proper data transformation, colors, and labels. Use this after selecting a chart type or when the user requests a specific chart type.';

const queryResultsSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  columns: z.array(z.string()),
});

export const GenerateChartTool = Tool.define('generateChart', {
  description: DESCRIPTION,
  parameters: z.object({
    chartType: z.enum(['bar', 'line', 'pie']).optional(),
    queryId: z
      .string()
      .optional()
      .describe('Query ID from runQuery to retrieve full results from cache'),
    queryResults: queryResultsSchema
      .optional()
      .describe('Query results (optional if queryId is provided)'),
    sqlQuery: z.string().optional(),
    userInput: z.string().optional(),
  }),
  async execute(params, _ctx) {
    const fullQueryResults = params.queryResults;

    if (!fullQueryResults) {
      throw new Error('Either queryId or queryResults must be provided');
    }

    const startTime = performance.now();
    const generateStartTime = performance.now();
    const result = await generateChart({
      chartType: params.chartType,
      queryResults: fullQueryResults,
      sqlQuery: params.sqlQuery ?? '',
      userInput: params.userInput ?? '',
    });
    const generateTime = performance.now() - generateStartTime;
    const totalTime = performance.now() - startTime;
    const logger = await getLogger();
    logger.debug(
      `[GenerateChartTool] [PERF] generateChart TOTAL took ${totalTime.toFixed(2)}ms (generate: ${generateTime.toFixed(2)}ms)`,
    );
    return result;
  },
});
