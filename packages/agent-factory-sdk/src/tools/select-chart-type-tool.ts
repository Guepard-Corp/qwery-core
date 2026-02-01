import { z } from 'zod/v3';
import { Tool } from './tool';
import { getWorkspace } from './read-data-context';
import { getQueryResult } from './query-result-cache';
import { loadBusinessContext } from './utils/business-context.storage';
import { selectChartType } from '../agents/tools/generate-chart';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION = `Analyzes query results to determine the best chart type (bar, line, or pie) based on the data structure and user intent. 
  Use this before generating a chart to select the most appropriate visualization type.`;

const queryResultsSchema = z.object({
  rows: z.array(z.record(z.unknown())),
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
    let fullQueryResults = params.queryResults;
    if (params.queryId) {
      const cachedResult = getQueryResult(ctx.conversationId, params.queryId);
      if (cachedResult) {
        fullQueryResults = {
          columns: cachedResult.columns,
          rows: cachedResult.rows,
        };
        const logger = await getLogger();
        logger.debug(
          `[SelectChartTypeTool] Retrieved full results from cache: ${cachedResult.rows.length} rows`,
        );
      } else {
        const logger = await getLogger();
        logger.warn(
          `[SelectChartTypeTool] Query result not found in cache: ${params.queryId}, using provided queryResults`,
        );
      }
    }

    if (!fullQueryResults) {
      throw new Error('Either queryId or queryResults must be provided');
    }

    const workspace = getWorkspace(ctx);
    const { join } = await import('node:path');
    const fileDir = join(workspace, ctx.conversationId);

    let businessContext = null;
    try {
      businessContext = await loadBusinessContext(fileDir);
    } catch {
      // Business context not available, continue without it
    }

    const result = await selectChartType(
      fullQueryResults,
      params.sqlQuery ?? '',
      params.userInput ?? '',
      businessContext,
    );
    return result;
  },
});
