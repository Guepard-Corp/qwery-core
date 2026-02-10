import { z } from 'zod';
import { Tool } from './tool';
import { selectChartType } from '../agents/tools/generate-chart';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION = `Analyzes query results to determine the best chart type (bar, line, or pie) based on the data structure and user intent. 
  Use this before generating a chart to select the most appropriate visualization type.`;

const queryResultsSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
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
  async execute(params, _ctx) {
    const logger = await getLogger();
    logger.debug('[SelectChartTypeTool] Tool execution:', {
      queryId: params.queryId,
      queryResults: params.queryResults,
      sqlQuery: params.sqlQuery,
      userInput: params.userInput,
    });
    const fullQueryResults = params.queryResults;

    if (!fullQueryResults) {
      throw new Error('Either queryId or queryResults must be provided');
    }

    const result = await selectChartType(
      fullQueryResults,
      params.sqlQuery ?? '',
      params.userInput ?? '',
    );
    return result;
  },
});
