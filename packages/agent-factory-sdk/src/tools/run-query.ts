import { z } from 'zod/v3';
import { Tool } from './tool';
import { getReadDataExtra } from './read-data-context';
import { datasourceOrchestrationService } from './datasource-orchestration-service';
import { getDatasourceDatabaseName } from './datasource-name-utils';
import { storeQueryResult } from './query-result-cache';
import { extractTablePathsFromQuery } from './validate-table-paths';
import { PROMPT_SOURCE } from '../domain';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION = `Run a SQL query against the DuckDB instance (views from file-based datasources or attached database tables). 
Query views by name (e.g., "customers") or attached tables by datasource path (e.g., "datasourcename.tablename" or "datasourcename.schema.tablename").
DuckDB enables federated queries across PostgreSQL, MySQL, Google Sheets, and other datasources.`;

export const RunQueryTool = Tool.define('runQuery', {
  description: DESCRIPTION,
  parameters: z.object({
    query: z.string(),
  }),
  async execute(params, ctx) {
    const extra = getReadDataExtra(ctx);
    if (!extra) {
      throw new Error('Read-data context not available');
    }
    const {
      queryEngine,
      repositories,
      conversationId,
      orchestrationResult,
      metadataDatasources,
      promptSource,
      intent,
    } = extra;

    const needSQL = intent?.needsSQL ?? false;
    const needChart = intent?.needsChart ?? false;
    const query = params.query;

    const isChartRequestInInlineMode =
      needChart === true &&
      promptSource === PROMPT_SOURCE.INLINE &&
      needSQL === true;

    const shouldSkipExecution =
      promptSource === PROMPT_SOURCE.INLINE &&
      needSQL === true &&
      !isChartRequestInInlineMode;

    const logger = await getLogger();
    logger.debug('[RunQueryTool] Tool execution:', {
      promptSource,
      needSQL,
      needChart,
      isChartRequestInInlineMode,
      shouldSkipExecution,
      queryLength: query.length,
      queryPreview: query.substring(0, 100),
    });

    if (shouldSkipExecution) {
      logger.debug(
        '[RunQueryTool] Skipping execution - SQL will be pasted to notebook cell',
      );
      return {
        result: null,
        shouldPaste: true,
        sqlQuery: query,
      };
    }

    if (isChartRequestInInlineMode) {
      logger.debug(
        '[RunQueryTool] Executing query for chart generation (inline mode override)',
      );
    } else {
      logger.debug('[RunQueryTool] Executing query normally');
    }

    const startTime = performance.now();

    if (!queryEngine) {
      throw new Error('Query engine not available');
    }
    if (!repositories) {
      throw new Error('Repositories not available');
    }

    const orchestration =
      await datasourceOrchestrationService.ensureAttachedAndCached(
        {
          conversationId,
          repositories,
          queryEngine,
          metadataDatasources,
        },
        orchestrationResult ?? undefined,
      );

    if (orchestration.datasources.length > 0) {
      try {
        const attachedDbNames = new Set(
          orchestration.datasources.map((d) =>
            getDatasourceDatabaseName(d.datasource),
          ),
        );
        const tablePaths = extractTablePathsFromQuery(query);
        const referencedDatasources = new Set<string>();

        for (const tablePath of tablePaths) {
          const parts = tablePath.split('.');
          if (parts.length >= 2 && parts[0]) {
            const datasourceName = parts[0];
            referencedDatasources.add(datasourceName);
          }
        }

        const invalidDatasources = Array.from(referencedDatasources).filter(
          (dbName) => !attachedDbNames.has(dbName),
        );

        if (invalidDatasources.length > 0) {
          throw new Error(
            `Query references unattached datasources: ${invalidDatasources.join(', ')}. Only these datasources are attached: ${Array.from(attachedDbNames).join(', ')}`,
          );
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('unattached datasources')
        ) {
          throw error;
        }
        logger.warn(
          '[RunQueryTool] Datasource validation failed, continuing with query execution:',
          error,
        );
      }
    }

    const syncTime = 0;

    try {
      const schemaCache = orchestration.schemaCache;
      const tablePaths = extractTablePathsFromQuery(query);
      const allAvailablePaths =
        schemaCache.getAllTablePathsFromAllDatasources();
      const missingTables: string[] = [];

      for (const tablePath of tablePaths) {
        if (
          !schemaCache.hasTablePath(tablePath) &&
          !allAvailablePaths.includes(tablePath)
        ) {
          const isSimpleName = !tablePath.includes('.');
          if (!isSimpleName) {
            missingTables.push(tablePath);
          }
        }
      }

      if (missingTables.length > 0) {
        const availablePaths = allAvailablePaths.slice(0, 20).join(', ');
        throw new Error(
          `The following tables are not available in attached datasources: ${missingTables.join(', ')}. Available tables: ${availablePaths}${allAvailablePaths.length > 20 ? '...' : ''}. Please check the attached datasources list and use only tables that exist.`,
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('not available in attached datasources')
      ) {
        throw error;
      }
      logger.warn(
        '[RunQueryTool] Failed to validate table paths in query:',
        error,
      );
    }

    let rewrittenQuery = query;
    const schemaCache = orchestration.schemaCache;
    const tablePaths = extractTablePathsFromQuery(query);
    const replacements: Array<{ from: string; to: string }> = [];

    for (const tablePath of tablePaths) {
      const parts = tablePath.split('.');
      if (parts.length === 3) {
        const [datasourceName, schemaName, tableName] = parts;

        if (schemaName !== 'main') {
          const queryPath = schemaCache.getQueryPathForDisplayPath(tablePath);

          if (queryPath) {
            replacements.push({ from: tablePath, to: queryPath });
          } else {
            const constructedQueryPath = `${datasourceName}.main.${tableName}`;
            const allPaths = schemaCache.getAllTablePathsFromAllDatasources();
            const pathExists = allPaths.includes(constructedQueryPath);

            if (pathExists) {
              replacements.push({
                from: tablePath,
                to: constructedQueryPath,
              });
            }
          }
        }
      }
    }

    if (replacements.length > 0) {
      for (const { from, to } of replacements) {
        const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
          new RegExp(`\\b${escapedFrom}\\b`, 'g'),
          new RegExp(`"${escapedFrom}"`, 'g'),
          new RegExp(`'${escapedFrom}'`, 'g'),
        ];

        for (const pattern of patterns) {
          rewrittenQuery = rewrittenQuery.replace(pattern, (match) => {
            if (match.startsWith('"') && match.endsWith('"')) {
              return `"${to}"`;
            }
            if (match.startsWith("'") && match.endsWith("'")) {
              return `'${to}'`;
            }
            return to;
          });
        }
      }
    }

    const queryStartTime = performance.now();
    const result = await queryEngine.query(rewrittenQuery);
    const queryTime = performance.now() - queryStartTime;
    const totalTime = performance.now() - startTime;
    logger.debug(
      `[RunQueryTool] [PERF] runQuery TOTAL took ${totalTime.toFixed(2)}ms (sync: ${syncTime.toFixed(2)}ms, query: ${queryTime.toFixed(2)}ms, rows: ${result.rows.length})`,
    );

    const columnNames = result.columns.map((col) =>
      typeof col === 'string' ? col : col.name || String(col),
    );
    const queryId = storeQueryResult(
      conversationId,
      query,
      columnNames,
      result.rows,
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
        queryId,
      };
    }

    return {
      result: fullResult,
      queryId,
    };
  },
});
