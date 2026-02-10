import { generateObject } from 'ai';
import { resolveModel, getDefaultModel } from '../../services';
import {
  ChartTypeSelectionSchema,
  ChartConfigSchema,
  type ChartType,
} from '../types/chart.types';
import { SELECT_CHART_TYPE_PROMPT } from '../prompts/select-chart-type.prompt';
import { GENERATE_CHART_CONFIG_PROMPT } from '../prompts/generate-chart-config.prompt';
import { getSupportedChartTypes } from '../config/supported-charts';
import { getLogger } from '@qwery/shared/logger';

export interface QueryResults {
  rows: Array<Record<string, unknown>>;
  columns: string[];
}

export interface GenerateChartInput {
  queryResults: QueryResults;
  sqlQuery: string;
  userInput: string;
  chartType?: ChartType; // Optional: if provided, skip selection step
}

/**
 * Step 1: Select the best chart type based on data analysis
 */
export async function selectChartType(
  queryResults: QueryResults,
  sqlQuery: string,
  userInput: string,
): Promise<{ chartType: ChartType; reasoningText: string }> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(new Error('Chart type selection timeout after 30 seconds')),
        30000,
      );
    });

    const generatePromise = generateObject({
      model: await resolveModel(getDefaultModel()),
      schema: ChartTypeSelectionSchema,
      prompt: SELECT_CHART_TYPE_PROMPT(userInput, sqlQuery, queryResults),
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    return result.object;
  } catch (error) {
    const logger = await getLogger();
    logger.error('[selectChartType] ERROR:', error);
    // Fallback to first supported chart type if selection fails
    const supportedTypes = getSupportedChartTypes();
    const fallbackType = supportedTypes[0] || 'bar';
    return {
      chartType: fallbackType,
      reasoningText: `Failed to analyze chart type, defaulting to ${fallbackType} chart`,
    };
  }
}

/**
 * Step 2: Generate chart configuration JSON
 */
export async function generateChartConfig(
  chartType: ChartType,
  queryResults: QueryResults,
  sqlQuery: string,
): Promise<{
  chartType: ChartType;
  data: Array<Record<string, unknown>>;
  config: {
    colors: string[];
    labels?: Record<string, string>;
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
  };
}> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(new Error('Chart config generation timeout after 30 seconds')),
        30000,
      );
    });

    const generatePromise = generateObject({
      model: await resolveModel(getDefaultModel()),
      schema: ChartConfigSchema,
      prompt: GENERATE_CHART_CONFIG_PROMPT(chartType, queryResults, sqlQuery),
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    return result.object;
  } catch (error) {
    const logger = await getLogger();
    logger.error('[generateChartConfig] ERROR:', error);
    throw new Error(
      `Failed to generate chart configuration: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Main function: Generate chart from query results
 * This is the entry point called by the generateChart tool
 */
export async function generateChart(input: GenerateChartInput): Promise<{
  chartType: ChartType;
  data: Array<Record<string, unknown>>;
  config: {
    colors: string[];
    labels?: Record<string, string>;
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
  };
}> {
  // Step 1: Always select chart type to get reasoning for UI
  // Even if chartType is provided, we still call selectChartType to get the reasoning
  // This ensures the UI always has the selection data to display
  const selection = await selectChartType(
    input.queryResults,
    input.sqlQuery,
    input.userInput,
  );
  const chartType = input.chartType || selection.chartType;

  // Step 2: Generate chart configuration
  const chartConfig = await generateChartConfig(
    chartType,
    input.queryResults,
    input.sqlQuery,
  );

  return chartConfig;
}
