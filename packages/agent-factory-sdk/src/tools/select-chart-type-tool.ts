import { z } from 'zod';
import { Tool } from './tool';
import { selectChartType } from '../agents/tools/generate-chart';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION = `Analyzes query results to determine the best chart type (bar, line, or pie) based on the data structure and user intent. 
  Use this before generating a chart to select the most appropriate visualization type.`;

const queryResultsSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  columns: z.array(z.string()),
});

export const SelectChartTypeTool = Tool.define('selectChartType', {
  description: DESCRIPTION,
  parameters: z.object({
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
    const logger = await getLogger();
    logger.debug('[SelectChartTypeTool] Tool execution:', {
      queryId: params.queryId,
      queryResults: params.queryResults,
      sqlQuery: params.sqlQuery,
      userInput: params.userInput,
    });
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
        logger.warn(
          '[SelectChartTypeTool] No queryResults and no last runQuery result; using empty results.',
        );
        fullQueryResults = { rows: [], columns: [] };
      }
    }

    const result = await selectChartType(
      fullQueryResults,
      params.sqlQuery ?? '',
      params.userInput ?? '',
    );
    return result;
  },
});
