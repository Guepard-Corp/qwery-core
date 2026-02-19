import { z } from 'zod/v3';
import {
  Experimental_Agent as Agent,
  convertToModelMessages,
  UIMessage,
  tool,
  validateUIMessages,
  stepCountIs,
} from 'ai';
import { fromPromise } from 'xstate/actors';
import { resolveModel } from '../../services/model-resolver';
import { testConnection } from '../../tools/test-connection';
import type {
  SimpleSchema,
  SimpleTable,
  Datasource,
} from '@qwery/domain/entities';
import { selectChartType, generateChart } from '../tools/generate-chart';
// deleteTable and renameTable are now methods on DuckDBQueryEngine
import { loadBusinessContext } from '../../tools/utils/business-context.storage';
import {
  buildReadDataAgentPrompt,
  type SupportedConnector,
} from '../prompts/read-data-agent.prompt';
import { getDiscoveredDatasources } from '@qwery/extensions-sdk';
import type { BusinessContext } from '../../tools/types/business-context.types';
import { mergeBusinessContexts } from '../../tools/utils/business-context.storage';
import { getConfig } from '../../tools/utils/business-context.config';
import { buildBusinessContext } from '../../tools/build-business-context';
import { enhanceBusinessContextInBackground } from './enhance-business-context.actor';
import type { Repositories } from '@qwery/domain/repositories';
import { AbstractQueryEngine } from '@qwery/domain/ports';
import { DuckDBQueryEngine } from '../../services/duckdb-query-engine.service';
import { getDatasourceDatabaseName } from '../../tools/datasource-name-utils';
import { TransformMetadataToSimpleSchemaService } from '@qwery/domain/services';
import type { PromptSource } from '../../domain';
import { PROMPT_SOURCE } from '../../domain';
import {
  storeQueryResult,
  getQueryResult,
} from '../../tools/query-result-cache';
import { extractTablePathsFromQuery } from '../../tools/validate-table-paths';
import { datasourceOrchestrationService } from '../../tools/datasource-orchestration-service';
import { getLogger } from '@qwery/shared/logger';

/**
 * Extract datasource IDs from message metadata
 */
function extractDatasourcesFromMessages(
  messages: UIMessage[],
): string[] | undefined {
  if (!messages || messages.length === 0) {
    return undefined;
  }

  // Find the last user message
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message && message.role === 'user' && message.metadata) {
      const metadata = message.metadata as Record<string, unknown>;
      const datasources = metadata.datasources;
      if (
        Array.isArray(datasources) &&
        datasources.length > 0 &&
        datasources.every((ds) => typeof ds === 'string')
      ) {
        getLogger().then((l) =>
          l.info(
            `[ReadDataAgent] Extracted ${datasources.length} datasource(s) from message metadata`,
          ),
        );
        return datasources as string[];
      }
    }
  }

  return undefined;
}

export const readDataAgent = async (
  conversationId: string,
  messages: UIMessage[],
  model: string,
  queryEngine: AbstractQueryEngine,
  repositories?: Repositories,
  promptSource?: PromptSource,
  intent?: {
    intent: string;
    complexity: string;
    needsChart: boolean;
    needsSQL: boolean;
  },
) => {
  const needSQL = intent?.needsSQL ?? false;
  const needChart = intent?.needsChart ?? false;

  // Extract datasources from message metadata (prioritized)
  const metadataDatasources = extractDatasourcesFromMessages(messages);

  const logger = await getLogger();
  logger.debug('[readDataAgent] Starting with context:', {
    conversationId,
    promptSource,
    needSQL,
    needChart,
    intentNeedsSQL: intent?.needsSQL,
    intentNeedsChart: intent?.needsChart,
    messageCount: messages.length,
    metadataDatasources: metadataDatasources?.length || 0,
  });

  // Initialize engine and attach datasources if repositories are provided
  const agentInitStartTime = performance.now();
  let orchestrationResult: Awaited<
    ReturnType<typeof datasourceOrchestrationService.orchestrate>
  > | null = null;

  if (repositories && queryEngine) {
    try {
      orchestrationResult = await datasourceOrchestrationService.orchestrate({
        conversationId,
        repositories,
        queryEngine,
        metadataDatasources,
      });
    } catch (error) {
      // Log but don't fail - datasources might not be available yet
      logger.warn(
        `[ReadDataAgent] Failed to initialize engine or datasources:`,
        error,
      );
    }
  }
  const agentInitTime = performance.now() - agentInitStartTime;
  if (agentInitTime > 50) {
    logger.debug(
      `[ReadDataAgent] [PERF] Agent initialization took ${agentInitTime.toFixed(2)}ms`,
    );
  }

  const attachedDatasources: Datasource[] =
    orchestrationResult?.datasources.map((d) => d.datasource) || [];

  const discovered = await getDiscoveredDatasources();
  const supportedConnectors: SupportedConnector[] = discovered.map((ds) => ({
    id: ds.id,
    name: ds.name,
  }));

  const agentPrompt = buildReadDataAgentPrompt(
    attachedDatasources,
    supportedConnectors,
  );

  async function runOneQuery(query: string): Promise<{
    result: { columns: string[]; rows: Record<string, unknown>[] };
    queryId: string;
  }> {
    if (!queryEngine) throw new Error('Query engine not available');
    if (!repositories) throw new Error('Repositories not available');
    const startTime = performance.now();
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
      const attachedDbNames = new Set(
        orchestration.datasources.map((d) =>
          getDatasourceDatabaseName(d.datasource),
        ),
      );
      const tablePaths = extractTablePathsFromQuery(query);
      const referencedDatasources = new Set<string>();
      for (const tablePath of tablePaths) {
        const parts = tablePath.split('.');
        if (parts.length >= 2 && parts[0]) referencedDatasources.add(parts[0]);
      }
      const invalidDatasources = Array.from(referencedDatasources).filter(
        (dbName) => !attachedDbNames.has(dbName),
      );
      if (invalidDatasources.length > 0)
        throw new Error(
          `Query references unattached datasources: ${invalidDatasources.join(', ')}. Only these datasources are attached: ${Array.from(attachedDbNames).join(', ')}`,
        );
    }
    const schemaCache = orchestration.schemaCache;
    const tablePaths = extractTablePathsFromQuery(query);
    const allAvailablePaths = schemaCache.getAllTablePathsFromAllDatasources();
    const missingTables: string[] = [];
    for (const tablePath of tablePaths) {
      if (
        !schemaCache.hasTablePath(tablePath) &&
        !allAvailablePaths.includes(tablePath) &&
        tablePath.includes('.')
      )
        missingTables.push(tablePath);
    }
    if (missingTables.length > 0)
      throw new Error(
        `The following tables are not available in attached datasources: ${missingTables.join(', ')}. Available tables: ${allAvailablePaths.slice(0, 20).join(', ')}${allAvailablePaths.length > 20 ? '...' : ''}. Please check the attached datasources list and use only tables that exist.`,
      );
    let rewrittenQuery = query;
    const replacements: Array<{ from: string; to: string }> = [];
    for (const tablePath of tablePaths) {
      const parts = tablePath.split('.');
      if (parts.length === 3) {
        const [datasourceName, schemaName, tableName] = parts;
        if (schemaName !== 'main') {
          const queryPath = schemaCache.getQueryPathForDisplayPath(tablePath);
          if (queryPath) replacements.push({ from: tablePath, to: queryPath });
          else {
            const constructedQueryPath = `${datasourceName}.main.${tableName}`;
            if (
              schemaCache
                .getAllTablePathsFromAllDatasources()
                .includes(constructedQueryPath)
            )
              replacements.push({ from: tablePath, to: constructedQueryPath });
          }
        }
      }
    }
    for (const { from, to } of replacements) {
      const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        new RegExp(`\\b${escapedFrom}\\b`, 'g'),
        new RegExp(`"${escapedFrom}"`, 'g'),
        new RegExp(`'${escapedFrom}'`, 'g'),
      ];
      for (const pattern of patterns)
        rewrittenQuery = rewrittenQuery.replace(pattern, (match) => {
          if (match.startsWith('"') && match.endsWith('"')) return `"${to}"`;
          if (match.startsWith("'") && match.endsWith("'")) return `'${to}'`;
          return to;
        });
    }
    const result = await queryEngine.query(rewrittenQuery);
    const columnNames = result.columns.map((col) =>
      typeof col === 'string' ? col : col.name || String(col),
    );
    const queryId = storeQueryResult(
      conversationId,
      query,
      columnNames,
      result.rows,
    );
    logger.debug(
      `[ReadDataAgent] [PERF] runOneQuery took ${(performance.now() - startTime).toFixed(2)}ms, rows: ${result.rows.length}`,
    );
    return {
      result: { columns: columnNames, rows: result.rows },
      queryId,
    };
  }

  const result = new Agent({
    model: await resolveModel(model),
    instructions: agentPrompt,
    tools: {
      testConnection: tool({
        description:
          'Test the connection to the database to check if the database is accessible',
        inputSchema: z.object({}),
        execute: async () => {
          const workspace =
            orchestrationResult?.workspace ||
            (() => {
              throw new Error('WORKSPACE environment variable is not set');
            })();
          const { join } = await import('node:path');
          const dbPath = join(workspace, conversationId, 'database.db');
          const result = await testConnection({
            dbPath: dbPath,
          });
          return result.toString();
        },
      }),
      getSchema: tool({
        description:
          'Get schema information (columns, data types, business context) for specific tables/views. Returns column names, types, and business context for the specified tables. If viewName is provided, returns schema for that specific view/table. If viewNames (array) is provided, returns schemas for only those specific tables/views. If neither is provided, returns schemas for everything discovered in DuckDB. This updates the business context automatically.',
        inputSchema: z.object({
          viewName: z.string().optional(),
          viewNames: z.array(z.string()).optional(),
        }),
        execute: async ({ viewName, viewNames }) => {
          const startTime = performance.now();
          // If both viewName and viewNames provided, prefer viewNames (array)
          const requestedViews = viewNames?.length
            ? viewNames
            : viewName
              ? [viewName]
              : undefined;

          logger.debug(
            `[ReadDataAgent] getSchema called${
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

          // Use orchestration service to ensure datasources are attached and cached
          const syncStartTime = performance.now();
          const orchestration =
            await datasourceOrchestrationService.ensureAttachedAndCached(
              {
                conversationId,
                repositories,
                queryEngine,
                metadataDatasources,
              },
              orchestrationResult || undefined,
            );
          const syncTime = performance.now() - syncStartTime;

          const workspace = orchestration.workspace;
          const schemaCache = orchestration.schemaCache;
          const allDatasources = orchestration.datasources;

          const { join } = await import('node:path');
          const fileDir = join(workspace, conversationId);
          const dbPath = join(fileDir, 'database.duckdb');

          logger.debug(
            `[ReadDataAgent] Workspace: ${workspace}, ConversationId: ${conversationId}, dbPath: ${dbPath}`,
          );

          // Get metadata from cache or query engine
          const schemaDiscoveryStartTime = performance.now();
          let schemaDiscoveryTime = 0;
          let collectedSchemas: Map<string, SimpleSchema> = new Map();

          try {
            // Check if we can use cache
            const allCached =
              allDatasources.length > 0 &&
              allDatasources.every(({ datasource }) =>
                schemaCache.isCached(datasource.id),
              );

            if (allCached && allDatasources.length > 0) {
              // Use cache - get all schemas (filtering by requestedViews happens below)
              logger.debug(
                `[ReadDataAgent] [CACHE] ✓ Using cached schema for ${allDatasources.length} datasource(s)`,
              );
              collectedSchemas = schemaCache.toSimpleSchemas(
                allDatasources.map((d) => d.datasource.id),
              );
              schemaDiscoveryTime =
                performance.now() - schemaDiscoveryStartTime;
              logger.debug(
                `[ReadDataAgent] [CACHE] ✓ Schema retrieved from cache in ${schemaDiscoveryTime.toFixed(2)}ms (${collectedSchemas.size} schema(s))`,
              );
            } else {
              logger.debug(
                `[ReadDataAgent] [CACHE] ✗ Cache miss or fallback, querying DuckDB metadata...`,
              );
              // Fallback to querying DuckDB (for main database or uncached datasources)
              // Build datasource database map and provider map for transformation
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

              // Get metadata from query engine
              const metadataStartTime = performance.now();
              const metadata = await queryEngine.metadata(
                allDatasources.length > 0
                  ? allDatasources.map((d) => d.datasource)
                  : undefined,
              );
              const metadataTime = performance.now() - metadataStartTime;
              logger.debug(
                `[ReadDataAgent] [PERF] queryEngine.metadata took ${metadataTime.toFixed(2)}ms`,
              );

              // Transform metadata to SimpleSchema format using domain service
              const transformStartTime = performance.now();
              const transformService =
                new TransformMetadataToSimpleSchemaService();
              collectedSchemas = await transformService.execute({
                metadata,
                datasourceDatabaseMap,
                datasourceProviderMap,
              });
              const transformTime = performance.now() - transformStartTime;
              logger.debug(
                `[ReadDataAgent] [PERF] transformMetadataToSimpleSchema took ${transformTime.toFixed(2)}ms`,
              );
            }

            // Filter by requested views if provided
            if (requestedViews && requestedViews.length > 0) {
              const filteredSchemas = new Map<string, SimpleSchema>();
              for (const viewId of requestedViews) {
                let foundSchema: SimpleSchema | undefined;
                let foundKey: string | undefined;

                // Parse viewId to extract database, schema, and table
                let db = 'main';
                let schema = 'main';
                let table = viewId;
                if (viewId.includes('.')) {
                  const parts = viewId.split('.');
                  if (parts.length === 3) {
                    // Format: datasourcename.schema.tablename
                    db = parts[0] ?? db;
                    schema = parts[1] ?? schema;
                    table = parts[2] ?? table;
                  } else if (parts.length === 2) {
                    // Format: datasourcename.tablename
                    db = parts[0] ?? db;
                    table = parts[1] ?? table;
                    schema = 'main'; // Default to main schema
                  }
                }

                // Try exact schema key match first
                const schemaKey = `${db}.${schema}`;
                foundSchema = collectedSchemas.get(schemaKey);
                if (foundSchema) {
                  foundKey = schemaKey;
                }

                // If not found, try with main schema
                if (!foundSchema && db !== 'main') {
                  const mainSchemaKey = `${db}.main`;
                  foundSchema = collectedSchemas.get(mainSchemaKey);
                  if (foundSchema) {
                    foundKey = mainSchemaKey;
                  }
                }

                // If still not found, search by table name across all schemas
                if (!foundSchema) {
                  for (const [key, schemaData] of collectedSchemas.entries()) {
                    for (const t of schemaData.tables) {
                      // Check if table name matches (handle both formatted and simple names)
                      // Table names in cache are formatted (e.g., "datasource.schema.table")
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
                  // Create a filtered schema with only the matching table
                  // Table names in cache are formatted (e.g., "datasource.schema.table" or "datasource.table")
                  // Match against both the full formatted name and the simple table name
                  const filteredTables = foundSchema.tables.filter((t) => {
                    // Exact matches
                    if (t.tableName === table || t.tableName === viewId) {
                      return true;
                    }
                    // Match formatted names: "datasource.schema.table" or "datasource.table"
                    if (
                      t.tableName.endsWith(`.${table}`) ||
                      t.tableName.endsWith(`.${viewId}`)
                    ) {
                      return true;
                    }
                    // Match if viewId is a full path and tableName contains it
                    if (viewId.includes('.') && t.tableName === viewId) {
                      return true;
                    }
                    return false;
                  });

                  if (filteredTables.length > 0) {
                    filteredSchemas.set(viewId, {
                      ...foundSchema,
                      tables: filteredTables,
                    });
                  } else {
                    // If no matching table found, use the whole schema
                    filteredSchemas.set(viewId, foundSchema);
                  }
                } else {
                  logger.warn(
                    `[ReadDataAgent] View "${viewId}" not found in metadata, skipping`,
                  );
                }
              }
              collectedSchemas = filteredSchemas;
            }

            schemaDiscoveryTime = performance.now() - schemaDiscoveryStartTime;
            logger.debug(
              `[ReadDataAgent] [PERF] Total schema discovery took ${schemaDiscoveryTime.toFixed(2)}ms`,
            );
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            logger.error(
              `[ReadDataAgent] Failed to get metadata: ${errorMsg}`,
              error,
            );
            throw error;
          }

          // Get performance configuration
          const perfConfigStartTime = performance.now();
          const perfConfig = await getConfig(fileDir);
          const perfConfigTime = performance.now() - perfConfigStartTime;
          logger.debug(
            `[ReadDataAgent] [PERF] getConfig took ${perfConfigTime.toFixed(2)}ms`,
          );

          // Build schemasMap with all collected schemas
          const schemasMap = collectedSchemas;

          // If specific views requested, return those schemas
          // Otherwise, return ALL schemas combined
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
              // Try exact match first
              let foundSchema = collectedSchemas.get(singleView);

              // If not found and it's a 2-part name (datasourcename.tablename), try with main schema
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
                // Single view requested - format table name to include schema
                const schemaKey = Array.from(collectedSchemas.entries()).find(
                  ([_, s]) => s === foundSchema,
                )?.[0];
                if (schemaKey && schemaKey.includes('.')) {
                  const parts = schemaKey.split('.');
                  if (parts.length >= 3) {
                    // Format table name as datasourcename.schema.tablename
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
                // View not found, return empty schema
                schema = {
                  databaseName: 'main',
                  schemaName: 'main',
                  tables: [],
                };
              }
            }
          } else {
            // All views - combine all schemas into one
            // Table names are already formatted in transformMetadataToSimpleSchema
            const allTables: SimpleTable[] = [];
            for (const [, schemaData] of collectedSchemas.entries()) {
              // Add tables from each schema (table names already formatted)
              allTables.push(...schemaData.tables);
            }

            // Determine primary database/schema from first entry or use defaults
            const firstSchema = collectedSchemas.values().next().value;
            schema = {
              databaseName: firstSchema?.databaseName || 'main',
              schemaName: firstSchema?.schemaName || 'main',
              tables: allTables,
            };
          }

          // Build fast context (synchronous, < 100ms)
          const contextStartTime = performance.now();
          let fastContext: BusinessContext;
          if (
            requestedViews &&
            requestedViews.length > 0 &&
            requestedViews.length === 1
          ) {
            // Single view - build fast context
            const singleViewName = requestedViews[0];
            if (singleViewName) {
              const buildContextStartTime = performance.now();
              fastContext = await buildBusinessContext({
                conversationDir: fileDir,
                viewName: singleViewName,
                schema,
              });
              const buildContextTime =
                performance.now() - buildContextStartTime;
              logger.debug(
                `[ReadDataAgent] [PERF] buildBusinessContext (single) took ${buildContextTime.toFixed(2)}ms`,
              );

              // Start enhancement in background (don't await)
              enhanceBusinessContextInBackground({
                conversationDir: fileDir,
                viewName: singleViewName,
                schema,
                dbPath,
              });
            } else {
              // Fallback to empty context
              const { createEmptyContext } = await import(
                '../../tools/utils/business-context.storage'
              );
              fastContext = createEmptyContext();
            }
          } else {
            // Multiple views - build fast context for each
            // Filter out system tables before processing
            const { isSystemOrTempTable } = await import(
              '../../tools/utils/business-context.utils'
            );

            const fastContexts: BusinessContext[] = [];
            for (const [vName, vSchema] of schemasMap.entries()) {
              // Skip system tables
              if (isSystemOrTempTable(vName)) {
                logger.debug(
                  `[ReadDataAgent] Skipping system table in context building: ${vName}`,
                );
                continue;
              }

              // Also check if schema has any valid tables
              const hasValidTables = vSchema.tables.some(
                (t) => !isSystemOrTempTable(t.tableName),
              );
              if (!hasValidTables) {
                logger.debug(
                  `[ReadDataAgent] Skipping schema with no valid tables: ${vName}`,
                );
                continue;
              }

              const buildContextStartTime = performance.now();
              const ctx = await buildBusinessContext({
                conversationDir: fileDir,
                viewName: vName,
                schema: vSchema,
              });
              const buildContextTime =
                performance.now() - buildContextStartTime;
              logger.debug(
                `[ReadDataAgent] [PERF] buildBusinessContext for ${vName} took ${buildContextTime.toFixed(2)}ms`,
              );
              fastContexts.push(ctx);

              // Start enhancement in background for each view
              enhanceBusinessContextInBackground({
                conversationDir: fileDir,
                viewName: vName,
                schema: vSchema,
                dbPath,
              });
            }
            // Merge all fast contexts into one
            const mergeStartTime = performance.now();
            fastContext = mergeBusinessContexts(fastContexts);
            const mergeTime = performance.now() - mergeStartTime;
            logger.debug(
              `[ReadDataAgent] [PERF] mergeBusinessContexts (${fastContexts.length} contexts) took ${mergeTime.toFixed(2)}ms`,
            );
          }
          const contextTime = performance.now() - contextStartTime;
          logger.debug(
            `[ReadDataAgent] [PERF] Total business context building took ${contextTime.toFixed(2)}ms`,
          );

          // Use fast context for immediate response
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

          // Include information about all discovered tables in the response
          // Extract table names from schemas (table names are already formatted)
          const allTableNames: string[] = [];
          for (const schemaData of collectedSchemas.values()) {
            for (const table of schemaData.tables) {
              allTableNames.push(table.tableName);
            }
          }
          const tableCount = allTableNames.length;

          const totalTime = performance.now() - startTime;
          logger.debug(
            `[ReadDataAgent] [PERF] getSchema TOTAL took ${totalTime.toFixed(2)}ms (sync: ${syncTime.toFixed(2)}ms, discovery: ${schemaDiscoveryTime.toFixed(2)}ms, context: ${contextTime.toFixed(2)}ms)`,
          );

          // Return schema and data insights (hide technical jargon)
          return {
            schema: schema,
            allTables: allTableNames, // Add this - list of all table/view names
            tableCount: tableCount, // Add this - total count
            businessContext: {
              domain: fastContext.domain.domain, // Just the domain name string
              entities: entities.map((e) => ({
                name: e.name,
                columns: e.columns,
              })), // Simplified - just name and columns
              relationships: relationships.map((r) => ({
                from: r.fromView,
                to: r.toView,
                join: r.joinCondition,
              })), // Simplified - just connection info
              vocabulary: vocabulary, // Keep for internal use but don't expose structure
            },
          };
        },
      }),
      runQuery: tool({
        description:
          'Run a SQL query against the DuckDB instance (views from file-based datasources or attached database tables). Query views by name (e.g., "customers") or attached tables by datasource path (e.g., "datasourcename.tablename" or "datasourcename.schema.tablename"). DuckDB enables federated queries across PostgreSQL, MySQL, Google Sheets, and other datasources.',
        inputSchema: z.object({
          query: z.string(),
        }),
        needsApproval: true,
        execute: async ({ query }) => {
          // TEMPORARY OVERRIDE: When needChart is true AND inline mode, execute query for chart generation
          const isChartRequestInInlineMode =
            needChart === true &&
            promptSource === PROMPT_SOURCE.INLINE &&
            needSQL === true;

          // Normal inline mode: skip execution, return SQL for pasting
          const shouldSkipExecution =
            promptSource === PROMPT_SOURCE.INLINE &&
            needSQL === true &&
            !isChartRequestInInlineMode;

          logger.debug('[runQuery] Tool execution:', {
            promptSource,
            needSQL,
            needChart,
            isChartRequestInInlineMode,
            shouldSkipExecution,
            queryLength: query.length,
            queryPreview: query.substring(0, 100),
          });

          // If inline mode and needSQL is true (but NOT chart request), don't execute - return SQL for pasting
          if (shouldSkipExecution) {
            logger.debug(
              '[runQuery] Skipping execution - SQL will be pasted to notebook cell',
            );
            return {
              result: null,
              shouldPaste: true,
              sqlQuery: query,
              executed: false,
            };
          }

          // For chart requests in inline mode, we'll execute but still return SQL for pasting
          if (isChartRequestInInlineMode) {
            logger.debug(
              '[runQuery] Executing query for chart generation (inline mode override)',
            );
          } else {
            logger.debug('[runQuery] Executing query normally');
          }

          const data = await runOneQuery(query);
          if (isChartRequestInInlineMode)
            return {
              ...data,
              shouldPaste: true,
              sqlQuery: query,
              chartExecutionOverride: true,
              executed: true,
            };
          return {
            ...data,
            executed: true,
          };
        },
      }),
      runQueries: tool({
        description:
          'Run multiple SQL queries in one call. Use this when you need to execute several independent queries (e.g. row counts for multiple tables, sample rows for several tables). Each item can have an optional id to correlate results and an optional summary field (concise one-sentence description of what the query does, e.g., "Row count for customers table"). The summary will be displayed as the query label in the UI. Queries run sequentially; use runQuery for a single query.',
        inputSchema: z.object({
          queries: z
            .array(
              z.object({
                id: z.string().optional(),
                query: z.string(),
              }),
            )
            .min(1),
        }),
        execute: async ({ queries }) => {
          const startTime = Date.now();
          const results: Array<{
            id?: string;
            query: string;
            success: boolean;
            data?: unknown;
            error?: string;
          }> = [];
          for (const item of queries) {
            try {
              const data = await runOneQuery(item.query);
              results.push({
                id: item.id,
                query: item.query,
                success: true,
                data,
              });
            } catch (err) {
              results.push({
                id: item.id,
                query: item.query,
                success: false,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
          const succeeded = results.filter((r) => r.success).length;
          const durationMs = Date.now() - startTime;
          return {
            results,
            meta: {
              total: results.length,
              succeeded,
              failed: results.length - succeeded,
              durationMs,
            },
          };
        },
      }),
      renameTable: tool({
        description:
          'Rename a table/view to give it a more meaningful name. Both oldTableName and newTableName are required.',
        inputSchema: z.object({
          oldTableName: z.string(),
          newTableName: z.string(),
        }),
        execute: async ({ oldTableName, newTableName }) => {
          if (!queryEngine) {
            throw new Error('Query engine not available');
          }
          // Use queryEngine method directly
          if (!(queryEngine instanceof DuckDBQueryEngine)) {
            throw new Error('renameTable requires DuckDBQueryEngine');
          }
          const result = await queryEngine.renameTable(
            oldTableName,
            newTableName,
          );
          return result;
        },
      }),
      deleteTable: tool({
        description:
          'Delete one or more tables/views from the database. Takes an array of table names to delete.',
        inputSchema: z.object({
          tableNames: z.array(z.string()),
        }),
        execute: async ({ tableNames }) => {
          if (!queryEngine) {
            throw new Error('Query engine not available');
          }
          // Use queryEngine method directly
          if (!(queryEngine instanceof DuckDBQueryEngine)) {
            throw new Error('deleteTable requires DuckDBQueryEngine');
          }
          const result = await queryEngine.deleteTable(tableNames);
          return result;
        },
      }),
      selectChartType: tool({
        description:
          'Analyzes query results to determine the best chart type (bar, line, or pie) based on the data structure and user intent. Use this before generating a chart to select the most appropriate visualization type.',
        inputSchema: z.object({
          queryId: z
            .string()
            .optional()
            .describe(
              'Query ID from runQuery to retrieve full results from cache',
            ),
          queryResults: z
            .object({
              rows: z.array(z.record(z.unknown())),
              columns: z.array(z.string()),
            })
            .optional()
            .describe('Query results (optional if queryId is provided)'),
          sqlQuery: z.string().optional(),
          userInput: z.string().optional(),
        }),
        execute: async ({
          queryId,
          queryResults,
          sqlQuery = '',
          userInput = '',
        }) => {
          // If queryId is provided, retrieve full results from cache
          let fullQueryResults = queryResults;
          if (queryId) {
            const cachedResult = getQueryResult(conversationId, queryId);
            if (cachedResult) {
              fullQueryResults = {
                columns: cachedResult.columns,
                rows: cachedResult.rows,
              };
              logger.debug(
                `[selectChartType] Retrieved full results from cache: ${cachedResult.rows.length} rows`,
              );
            } else {
              logger.warn(
                `[selectChartType] Query result not found in cache: ${queryId}, using provided queryResults`,
              );
            }
          }

          if (!fullQueryResults) {
            throw new Error('Either queryId or queryResults must be provided');
          }
          const workspace =
            orchestrationResult?.workspace ||
            (() => {
              throw new Error('WORKSPACE environment variable is not set');
            })();
          const { join } = await import('node:path');
          const fileDir = join(workspace, conversationId);

          // Load business context if available
          let businessContext: BusinessContext | null = null;
          try {
            businessContext = await loadBusinessContext(fileDir);
          } catch {
            // Business context not available, continue without it
          }

          const result = await selectChartType(
            fullQueryResults,
            sqlQuery,
            userInput,
            businessContext,
          );
          return result;
        },
      }),
      generateChart: tool({
        description:
          'Generates a chart configuration JSON for visualization. Takes query results and creates a chart (bar, line, or pie) with proper data transformation, colors, and labels. Use this after selecting a chart type or when the user requests a specific chart type.',
        inputSchema: z.object({
          chartType: z.enum(['bar', 'line', 'pie']).optional(),
          queryId: z
            .string()
            .optional()
            .describe(
              'Query ID from runQuery to retrieve full results from cache',
            ),
          queryResults: z
            .object({
              rows: z.array(z.record(z.unknown())),
              columns: z.array(z.string()),
            })
            .optional()
            .describe('Query results (optional if queryId is provided)'),
          sqlQuery: z.string().optional(),
          userInput: z.string().optional(),
        }),
        execute: async ({
          chartType,
          queryId,
          queryResults,
          sqlQuery = '',
          userInput = '',
        }) => {
          // If queryId is provided, retrieve full results from cache
          let fullQueryResults = queryResults;
          if (queryId) {
            const cachedResult = getQueryResult(conversationId, queryId);
            if (cachedResult) {
              fullQueryResults = {
                columns: cachedResult.columns,
                rows: cachedResult.rows,
              };
              logger.debug(
                `[generateChart] Retrieved full results from cache: ${cachedResult.rows.length} rows`,
              );
            } else {
              logger.warn(
                `[generateChart] Query result not found in cache: ${queryId}, using provided queryResults`,
              );
            }
          }

          if (!fullQueryResults) {
            throw new Error('Either queryId or queryResults must be provided');
          }
          const startTime = performance.now();
          const workspace =
            orchestrationResult?.workspace ||
            (() => {
              throw new Error('WORKSPACE environment variable is not set');
            })();
          const { join } = await import('node:path');
          const fileDir = join(workspace, conversationId);

          // Load business context if available
          const contextStartTime = performance.now();
          let businessContext: BusinessContext | null = null;
          try {
            businessContext = await loadBusinessContext(fileDir);
          } catch {
            // Business context not available, continue without it
          }
          const contextTime = performance.now() - contextStartTime;
          if (contextTime > 10) {
            logger.debug(
              `[ReadDataAgent] [PERF] generateChart loadBusinessContext took ${contextTime.toFixed(2)}ms`,
            );
          }

          const generateStartTime = performance.now();
          const result = await generateChart({
            chartType,
            queryResults: fullQueryResults,
            sqlQuery,
            userInput,
            businessContext,
          });
          const generateTime = performance.now() - generateStartTime;
          const totalTime = performance.now() - startTime;
          logger.debug(
            `[ReadDataAgent] [PERF] generateChart TOTAL took ${totalTime.toFixed(2)}ms (context: ${contextTime.toFixed(2)}ms, generate: ${generateTime.toFixed(2)}ms)`,
          );
          return result;
        },
      }),
    },
    stopWhen: stepCountIs(20),
    providerOptions: {
      openai: {
        reasoningSummary: 'auto',
        reasoningEffort: 'medium',
        reasoningDetailedSummary: true,
        reasoningDetailedSummaryLength: 'long',
      },
    },
  });

  return result.stream({
    messages: await convertToModelMessages(
      await validateUIMessages({ messages }),
    ),
  });
};

export const readDataAgentActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      conversationId: string;
      previousMessages: UIMessage[];
      model: string;
      repositories?: Repositories;
      queryEngine: AbstractQueryEngine;
      promptSource?: PromptSource;
      intent?: {
        intent: string;
        complexity: string;
        needsChart: boolean;
        needsSQL: boolean;
      };
    };
  }) => {
    const logger = await getLogger();
    logger.debug('[readDataAgentActor] Received input:', {
      conversationId: input.conversationId,
      promptSource: input.promptSource,
      intentNeedsSQL: input.intent?.needsSQL,
      messageCount: input.previousMessages.length,
    });
    return readDataAgent(
      input.conversationId,
      input.previousMessages,
      input.model,
      input.queryEngine,
      input.repositories,
      input.promptSource,
      input.intent,
    );
  },
);
