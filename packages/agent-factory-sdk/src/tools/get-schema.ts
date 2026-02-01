import { z } from 'zod/v3';
import type { SimpleSchema, SimpleTable } from '@qwery/domain/entities';
import type { BusinessContext } from './types/business-context.types';
import { Tool } from './tool';
import { getReadDataExtra } from './read-data-context';
import { datasourceOrchestrationService } from './datasource-orchestration-service';
import { getDatasourceDatabaseName } from './datasource-name-utils';
import { TransformMetadataToSimpleSchemaService } from '@qwery/domain/services';
import { getConfig } from './utils/business-context.config';
import { buildBusinessContext } from './build-business-context';
import { enhanceBusinessContextInBackground } from '../agents/actors/enhance-business-context.actor';
import {
  mergeBusinessContexts,
  createEmptyContext,
} from './utils/business-context.storage';
import { isSystemOrTempTable } from './utils/business-context.utils';
import { getLogger } from '@qwery/shared/logger';

const DESCRIPTION = `Get schema information (columns, data types, business context) for specific tables/views. Returns column names, types, and business context for the specified tables.
If viewName is provided, returns schema for that specific view/table. 
If viewNames (array) is provided, returns schemas for only those specific tables/views. 
If neither is provided, returns schemas for everything discovered in DuckDB. 
This updates the business context automatically.`;

export const GetSchemaTool = Tool.define('getSchema', {
  description: DESCRIPTION,
  parameters: z.object({
    viewName: z.string().optional(),
    viewNames: z.array(z.string()).optional(),
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
    } = extra;

    const startTime = performance.now();
    const requestedViews = params.viewNames?.length
      ? params.viewNames
      : params.viewName
        ? [params.viewName]
        : undefined;

    const logger = await getLogger();
    logger.debug(
      `[GetSchemaTool] getSchema called${
        requestedViews
          ? ` for ${requestedViews.length} view(s): ${requestedViews.join(', ')}`
          : ' (all views)'
      }`,
    );

    if (!queryEngine) {
      throw new Error('Query engine not available');
    }
    if (!repositories) {
      throw new Error('Repositories not available');
    }

    const syncStartTime = performance.now();
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
    const syncTime = performance.now() - syncStartTime;

    const workspace = orchestration.workspace;
    const schemaCache = orchestration.schemaCache;
    const allDatasources = orchestration.datasources;

    const { join } = await import('node:path');
    const fileDir = join(workspace, conversationId);
    const dbPath = join(fileDir, 'database.duckdb');

    logger.debug(
      `[GetSchemaTool] Workspace: ${workspace}, ConversationId: ${conversationId}, dbPath: ${dbPath}`,
    );

    const schemaDiscoveryStartTime = performance.now();
    let schemaDiscoveryTime = 0;
    let collectedSchemas: Map<string, SimpleSchema> = new Map();

    try {
      const allCached =
        allDatasources.length > 0 &&
        allDatasources.every(({ datasource }) =>
          schemaCache.isCached(datasource.id),
        );

      if (allCached && allDatasources.length > 0) {
        logger.debug(
          `[GetSchemaTool] [CACHE] Using cached schema for ${allDatasources.length} datasource(s)`,
        );
        collectedSchemas = schemaCache.toSimpleSchemas(
          allDatasources.map((d) => d.datasource.id),
        );
        schemaDiscoveryTime = performance.now() - schemaDiscoveryStartTime;
      } else {
        logger.debug(
          `[GetSchemaTool] [CACHE] Cache miss or fallback, querying DuckDB metadata...`,
        );
        const datasourceDatabaseMap = new Map<string, string>();
        const datasourceProviderMap = new Map<string, string>();
        for (const { datasource } of allDatasources) {
          const dbName = getDatasourceDatabaseName(datasource);
          datasourceDatabaseMap.set(datasource.id, dbName);
          datasourceProviderMap.set(
            datasource.id,
            datasource.datasource_provider,
          );
        }

        const metadata = await queryEngine.metadata(
          allDatasources.length > 0
            ? allDatasources.map((d) => d.datasource)
            : undefined,
        );

        const transformService = new TransformMetadataToSimpleSchemaService();
        collectedSchemas = await transformService.execute({
          metadata,
          datasourceDatabaseMap,
          datasourceProviderMap,
        });
      }

      if (requestedViews && requestedViews.length > 0) {
        const filteredSchemas = new Map<string, SimpleSchema>();
        for (const viewId of requestedViews) {
          let foundSchema: SimpleSchema | undefined;
          let foundKey: string | undefined;

          let db = 'main';
          let schemaName = 'main';
          let table = viewId;
          if (viewId.includes('.')) {
            const parts = viewId.split('.');
            if (parts.length === 3) {
              db = parts[0] ?? db;
              schemaName = parts[1] ?? schemaName;
              table = parts[2] ?? table;
            } else if (parts.length === 2) {
              db = parts[0] ?? db;
              table = parts[1] ?? table;
              schemaName = 'main';
            }
          }

          const schemaKey = `${db}.${schemaName}`;
          foundSchema = collectedSchemas.get(schemaKey);
          if (foundSchema) {
            foundKey = schemaKey;
          }

          if (!foundSchema && db !== 'main') {
            const mainSchemaKey = `${db}.main`;
            foundSchema = collectedSchemas.get(mainSchemaKey);
            if (foundSchema) {
              foundKey = mainSchemaKey;
            }
          }

          if (!foundSchema) {
            for (const [key, schemaData] of collectedSchemas.entries()) {
              for (const t of schemaData.tables) {
                const tableNameMatch =
                  t.tableName === table ||
                  t.tableName === viewId ||
                  t.tableName.endsWith(`.${table}`) ||
                  t.tableName.endsWith(`.${viewId}`) ||
                  (viewId.includes('.') && t.tableName === viewId);
                if (tableNameMatch) {
                  foundSchema = schemaData;
                  foundKey = key;
                  break;
                }
              }
              if (foundSchema) break;
            }
          }

          if (foundSchema && foundKey) {
            const filteredTables = foundSchema.tables.filter((t) => {
              if (t.tableName === table || t.tableName === viewId) return true;
              if (
                t.tableName.endsWith(`.${table}`) ||
                t.tableName.endsWith(`.${viewId}`)
              ) {
                return true;
              }
              if (viewId.includes('.') && t.tableName === viewId) return true;
              return false;
            });

            if (filteredTables.length > 0) {
              filteredSchemas.set(viewId, {
                ...foundSchema,
                tables: filteredTables,
              });
            } else {
              filteredSchemas.set(viewId, foundSchema);
            }
          } else {
            logger.warn(
              `[GetSchemaTool] View "${viewId}" not found in metadata, skipping`,
            );
          }
        }
        collectedSchemas = filteredSchemas;
      }

      schemaDiscoveryTime = performance.now() - schemaDiscoveryStartTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `[GetSchemaTool] Failed to get metadata: ${errorMsg}`,
        error,
      );
      throw error;
    }

    const perfConfig = await getConfig(fileDir);
    const schemasMap = collectedSchemas;

    let schema: SimpleSchema;
    if (
      requestedViews &&
      requestedViews.length > 0 &&
      requestedViews.length === 1
    ) {
      const singleView = requestedViews[0] ?? '';
      if (!singleView) {
        schema = {
          databaseName: 'main',
          schemaName: 'main',
          tables: [],
        };
      } else {
        let foundSchema = collectedSchemas.get(singleView);

        if (
          !foundSchema &&
          singleView.includes('.') &&
          singleView.split('.').length === 2
        ) {
          const parts = singleView.split('.');
          const withMainSchema = `${parts[0]}.main.${parts[1]}`;
          foundSchema = collectedSchemas.get(withMainSchema);
        }

        if (foundSchema) {
          const schemaKey = Array.from(collectedSchemas.entries()).find(
            ([_, s]) => s === foundSchema,
          )?.[0];
          if (schemaKey && schemaKey.includes('.')) {
            const parts = schemaKey.split('.');
            if (parts.length >= 3) {
              foundSchema = {
                ...foundSchema,
                tables: foundSchema.tables.map((t) => ({
                  ...t,
                  tableName: `${parts[0]}.${parts[1]}.${t.tableName}`,
                })),
              };
            }
          }
          schema = foundSchema;
        } else {
          schema = {
            databaseName: 'main',
            schemaName: 'main',
            tables: [],
          };
        }
      }
    } else {
      const allTables: SimpleTable[] = [];
      for (const [, schemaData] of collectedSchemas.entries()) {
        allTables.push(...schemaData.tables);
      }
      const firstSchema = collectedSchemas.values().next().value;
      schema = {
        databaseName: firstSchema?.databaseName || 'main',
        schemaName: firstSchema?.schemaName || 'main',
        tables: allTables,
      };
    }

    const contextStartTime = performance.now();
    let fastContext: BusinessContext;
    if (
      requestedViews &&
      requestedViews.length > 0 &&
      requestedViews.length === 1
    ) {
      const singleViewName = requestedViews[0];
      if (singleViewName) {
        fastContext = await buildBusinessContext({
          conversationDir: fileDir,
          viewName: singleViewName,
          schema,
        });
        enhanceBusinessContextInBackground({
          conversationDir: fileDir,
          viewName: singleViewName,
          schema,
          dbPath,
        });
      } else {
        fastContext = createEmptyContext();
      }
    } else {
      const fastContexts: BusinessContext[] = [];
      for (const [vName, vSchema] of schemasMap.entries()) {
        if (isSystemOrTempTable(vName)) continue;
        const hasValidTables = vSchema.tables.some(
          (t) => !isSystemOrTempTable(t.tableName),
        );
        if (!hasValidTables) continue;

        const context = await buildBusinessContext({
          conversationDir: fileDir,
          viewName: vName,
          schema: vSchema,
        });
        fastContexts.push(context);
        enhanceBusinessContextInBackground({
          conversationDir: fileDir,
          viewName: vName,
          schema: vSchema,
          dbPath,
        });
      }
      fastContext = mergeBusinessContexts(fastContexts);
    }
    const contextTime = performance.now() - contextStartTime;

    const entities = Array.from(fastContext.entities.values()).slice(
      0,
      perfConfig.expectedViewCount * 2,
    );
    const relationships = fastContext.relationships.slice(
      0,
      perfConfig.expectedViewCount * 3,
    );
    const vocabulary = Object.fromEntries(
      Array.from(fastContext.vocabulary.entries())
        .slice(0, perfConfig.expectedViewCount * 10)
        .map(([key, entry]) => [key, entry]),
    );

    const allTableNames: string[] = [];
    for (const schemaData of collectedSchemas.values()) {
      for (const table of schemaData.tables) {
        allTableNames.push(table.tableName);
      }
    }
    const tableCount = allTableNames.length;

    const totalTime = performance.now() - startTime;
    logger.debug(
      `[GetSchemaTool] [PERF] getSchema TOTAL took ${totalTime.toFixed(2)}ms (sync: ${syncTime.toFixed(2)}ms, discovery: ${schemaDiscoveryTime.toFixed(2)}ms, context: ${contextTime.toFixed(2)}ms)`,
    );

    return {
      schema,
      allTables: allTableNames,
      tableCount,
      businessContext: {
        domain: fastContext.domain.domain,
        entities: entities.map((e) => ({
          name: e.name,
          columns: e.columns,
        })),
        relationships: relationships.map((r) => ({
          from: r.fromView,
          to: r.toView,
          join: r.joinCondition,
        })),
        vocabulary,
      },
    };
  },
});
