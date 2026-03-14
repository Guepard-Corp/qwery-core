import { z } from 'zod';
import { Tool } from './tool';
import { generateChart } from '../agents/tools/generate-chart';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION =
  'Generates a chart configuration JSON for visualization. Takes query results and creates a chart (bar, line, or pie) with proper data transformation, colors, and labels. Use this after selecting a chart type or when the user requests a specific chart type.';

const queryResultsSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).optional().default([]),
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
  async execute(params, ctx) {
    let fullQueryResults = params.queryResults;

    if (!fullQueryResults || (fullQueryResults.rows?.length ?? 0) === 0) {
      const extra = ctx.extra as {
        lastRunQueryResult?: {
          current: { columns: string[]; rows: unknown[] } | null;
        };
      };
      const lastResult = extra?.lastRunQueryResult?.current;
      if (lastResult && lastResult.rows.length > 0) {
        fullQueryResults = {
          columns: lastResult.columns,
          rows: lastResult.rows as Array<Record<string, unknown>>,
        };
      } else if (!fullQueryResults) {
        const logger = await getLogger();
        logger.warn(
          '[GenerateChartTool] No queryResults provided and no last runQuery result in context; using empty results.',
        );
        fullQueryResults = { rows: [], columns: [] };
      }
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
