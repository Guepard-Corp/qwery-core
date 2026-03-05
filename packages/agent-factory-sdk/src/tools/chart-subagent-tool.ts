import { z } from 'zod';
import { Tool } from './tool';
import { runChartSubagent } from '../agents/chart-subagent';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION =
  'Chart subagent entrypoint. Generates a chart configuration JSON for visualization using chart-specific prompts and logic, based on query results and user intent.';

const queryResultsSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  columns: z.array(z.string()),
});

export const ChartSubagentTool = Tool.define('chartSubagent', {
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
          '[ChartSubagentTool] No queryResults provided and no last runQuery result in context; using empty results.',
        );
        fullQueryResults = { rows: [], columns: [] };
      }
    }

    const startTime = performance.now();
    const generateStartTime = performance.now();
    const result = await runChartSubagent({
      chartType: params.chartType,
      queryResults: fullQueryResults,
      sqlQuery: params.sqlQuery ?? '',
      userInput: params.userInput ?? '',
    });
    const generateTime = performance.now() - generateStartTime;
    const totalTime = performance.now() - startTime;
    const logger = await getLogger();
    logger.debug(
      `[ChartSubagentTool] [PERF] runChartSubagent TOTAL took ${totalTime.toFixed(
        2,
      )}ms (generate: ${generateTime.toFixed(2)}ms)`,
    );
    return result;
  },
});
