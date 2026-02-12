import { z } from 'zod';
import { Tool } from './tool';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import { getDriverInstance } from '@qwery/extensions-loader';
import { getLogger } from '@qwery/shared/logger';
import { Repositories } from '@qwery/domain/repositories';

const DESCRIPTION = `Run a SQL query directly against a single datasource using its native driver.`;

export const RunQueryTool = Tool.define('runQuery', {
  description: DESCRIPTION,
  parameters: z.object({
    datasourceId: z
      .string()
      .describe('The ID of the datasource to run the query against'),
    query: z.string().describe('The SQL query to execute'),
  }),
  async execute(params, ctx) {
    const { repositories, attachedDatasources } = ctx.extra as {
      repositories: Repositories;
      attachedDatasources: string[];
    };

    const intent = {
      needsSQL: false,
      needsChart: false,
    };

    const logger = await getLogger();
    const { datasourceId, query } = params;

    const needSQL = intent?.needsSQL ?? false;
    const needChart = intent?.needsChart ?? false;

    const isChartRequestInInlineMode = needChart === true && needSQL === true;

    const shouldSkipExecution = needSQL === true && !isChartRequestInInlineMode;

    logger.debug('[RunQueryToolV2] Tool execution:', {
      needSQL,
      needChart,
      isChartRequestInInlineMode,
      shouldSkipExecution,
      queryLength: query.length,
      queryPreview: query.substring(0, 100),
      datasourceId,
    });

    if (shouldSkipExecution) {
      logger.debug(
        '[RunQueryToolV2] Skipping execution - SQL will be pasted to notebook cell',
      );
      return {
        result: null,
        shouldPaste: true,
        sqlQuery: query,
        executed: false,
      };
    }

    if (isChartRequestInInlineMode) {
      logger.debug(
        '[RunQueryToolV2] Executing query for chart generation (inline mode override)',
      );
    } else {
      logger.debug('[RunQueryToolV2] Executing query normally');
    }

    const startTime = performance.now();

    const datasource = await repositories.datasource.findById(
      attachedDatasources[0] ?? '',
    );
    if (!datasource) {
      throw new Error(`Datasource not found: ${attachedDatasources[0] ?? ''}`);
    }

    const extension = ExtensionsRegistry.get(datasource.datasource_provider) as
      | DatasourceExtension
      | undefined;

    if (!extension?.drivers?.length) {
      throw new Error(
        `No driver found for provider: ${datasource.datasource_provider}`,
      );
    }

    const nodeDriver =
      extension.drivers.find((d) => d.runtime === 'node') ??
      extension.drivers[0];

    if (!nodeDriver) {
      throw new Error(
        `No node driver for provider: ${datasource.datasource_provider}`,
      );
    }

    const instance = await getDriverInstance(nodeDriver, {
      config: datasource.config,
    });

    try {
      const queryStartTime = performance.now();
      const result = await instance.query(query);
      const queryTime = performance.now() - queryStartTime;
      const totalTime = performance.now() - startTime;

      logger.debug(
        `[RunQueryToolV2] [PERF] runQueryV2 TOTAL took ${totalTime.toFixed(2)}ms (query: ${queryTime.toFixed(2)}ms, rows: ${result.rows.length})`,
      );

      const columnNames = result.columns.map((col) =>
        typeof col === 'string' ? col : col.name || String(col),
      );

      const fullResult = {
        columns: columnNames,
        rows: result.rows,
      };

      if (isChartRequestInInlineMode) {
        return {
          result: fullResult,
          shouldPaste: true,
          sqlQuery: query,
          chartExecutionOverride: true,
        };
      }

      return {
        result: fullResult,
        sqlQuery: query,
        executed: true,
      };
    } finally {
      if (typeof instance.close === 'function') {
        await instance.close();
      }
    }
  },
});
