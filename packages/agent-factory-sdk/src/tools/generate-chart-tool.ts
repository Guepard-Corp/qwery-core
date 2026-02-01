import { z } from 'zod/v3';
import { Tool } from './tool';
import { getWorkspace } from './read-data-context';
import { getQueryResult } from './query-result-cache';
import { loadBusinessContext } from './utils/business-context.storage';
import { generateChart } from '../agents/tools/generate-chart';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION =
  'Generates a chart configuration JSON for visualization. Takes query results and creates a chart (bar, line, or pie) with proper data transformation, colors, and labels. Use this after selecting a chart type or when the user requests a specific chart type.';

const queryResultsSchema = z.object({
  rows: z.array(z.record(z.unknown())),
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
    if (params.queryId) {
      const cachedResult = getQueryResult(ctx.conversationId, params.queryId);
      if (cachedResult) {
        fullQueryResults = {
          columns: cachedResult.columns,
          rows: cachedResult.rows,
        };
        const logger = await getLogger();
        logger.debug(
          `[GenerateChartTool] Retrieved full results from cache: ${cachedResult.rows.length} rows`,
        );
      } else {
        const logger = await getLogger();
        logger.warn(
          `[GenerateChartTool] Query result not found in cache: ${params.queryId}, using provided queryResults`,
        );
      }
    }

    if (!fullQueryResults) {
      throw new Error('Either queryId or queryResults must be provided');
    }

    const startTime = performance.now();
    const workspace = getWorkspace(ctx);
    const { join } = await import('node:path');
    const fileDir = join(workspace, ctx.conversationId);

    const contextStartTime = performance.now();
    let businessContext = null;
    try {
      businessContext = await loadBusinessContext(fileDir);
    } catch {
      // Business context not available, continue without it
    }
    const contextTime = performance.now() - contextStartTime;
    const logger = await getLogger();
    if (contextTime > 10) {
      logger.debug(
        `[GenerateChartTool] [PERF] loadBusinessContext took ${contextTime.toFixed(2)}ms`,
      );
    }

    const generateStartTime = performance.now();
    const result = await generateChart({
      chartType: params.chartType,
      queryResults: fullQueryResults,
      sqlQuery: params.sqlQuery ?? '',
      userInput: params.userInput ?? '',
      businessContext,
    });
    const generateTime = performance.now() - generateStartTime;
    const totalTime = performance.now() - startTime;
    logger.debug(
      `[GenerateChartTool] [PERF] generateChart TOTAL took ${totalTime.toFixed(2)}ms (context: ${contextTime.toFixed(2)}ms, generate: ${generateTime.toFixed(2)}ms)`,
    );
    return result;
  },
});
