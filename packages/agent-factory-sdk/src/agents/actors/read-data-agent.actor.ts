import { z } from 'zod';
import {
  Experimental_Agent as Agent,
  convertToModelMessages,
  UIMessage,
  tool,
  validateUIMessages,
  stepCountIs,
} from 'ai';
import { fromPromise } from 'xstate/actors';
import { resolveModel } from '../../services';
import { testConnection } from '../../tools/test-connection';
import type {
  SimpleSchema,
  SimpleTable,
  Datasource,
} from '@qwery/domain/entities';
import { selectChartType, generateChart } from '../tools/generate-chart';
import { renameTable } from '../../tools/rename-table';
import { deleteTable } from '../../tools/delete-table';
import { loadBusinessContext } from '../../tools/utils/business-context.storage';
import { buildReadDataAgentPrompt } from '../prompts/read-data-agent.prompt';
import type { BusinessContext } from '../../tools/types/business-context.types';
import { mergeBusinessContexts } from '../../tools/utils/business-context.storage';
import { getConfig } from '../../tools/utils/business-context.config';
import { buildBusinessContext } from '../../tools/build-business-context';
import { enhanceBusinessContextInBackground } from './enhance-business-context.actor';
import type { Repositories } from '@qwery/domain/repositories';
import { GetConversationBySlugService } from '@qwery/domain/services';
import { AbstractQueryEngine } from '@qwery/domain/ports';
import { loadDatasources } from '../../tools/datasource-loader';
import { getDatasourceDatabaseName } from '../../tools/datasource-name-utils';
import { TransformMetadataToSimpleSchemaService } from '@qwery/domain/services';
import type { PromptSource } from '../../domain';
import { PROMPT_SOURCE } from '../../domain';
import { getSchemaCache } from '../../tools/schema-cache';
import {
  storeQueryResult,
  getQueryResult,
} from '../../tools/query-result-cache';

// Type for query engine with attach method that accepts options
type QueryEngineWithAttachOptions = AbstractQueryEngine & {
  attach(
    datasources: Datasource[],
    options?: { conversationId?: string; workspace?: string },
  ): Promise<void>;
};

// Lazy workspace resolution - only resolve when actually needed, not at module load time
// This prevents side effects when the module is imported in browser/SSR contexts
let WORKSPACE_CACHE: string | undefined;

function resolveWorkspaceDir(): string | undefined {
  const globalProcess =
    typeof globalThis !== 'undefined'
      ? (globalThis as { process?: NodeJS.Process }).process
      : undefined;
  const envValue =
    globalProcess?.env?.WORKSPACE ??
    globalProcess?.env?.VITE_WORKING_DIR ??
    globalProcess?.env?.WORKING_DIR;
  if (envValue) {
    return envValue;
  }

  try {
    return (import.meta as { env?: Record<string, string> })?.env
      ?.VITE_WORKING_DIR;
  } catch {
    return undefined;
  }
}

function getWorkspace(): string | undefined {
  if (WORKSPACE_CACHE === undefined) {
    WORKSPACE_CACHE = resolveWorkspaceDir();
  }
  return WORKSPACE_CACHE;
}

/**
 * Extract datasource IDs from message metadata
 * Checks the last user message for datasources in metadata
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
        console.log(
          `[ReadDataAgent] Extracted ${datasources.length} datasource(s) from message metadata`,
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

  console.log('[readDataAgent] Starting with context:', {
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
  if (repositories && queryEngine) {
    try {
      // Get conversation to find datasources
      // Note: conversationId is actually a slug in this context
      const getConvStartTime = performance.now();
      const getConversationService = new GetConversationBySlugService(
        repositories.conversation,
      );
      const conversation = await getConversationService.execute(conversationId);
      const getConvTime = performance.now() - getConvStartTime;
      console.log(
        `[ReadDataAgent] [PERF] Agent init getConversation took ${getConvTime.toFixed(2)}ms`,
      );

      // Determine which datasources to use (prioritize metadata over conversation)
      const datasourcesToUse =
        metadataDatasources && metadataDatasources.length > 0
          ? metadataDatasources
          : conversation?.datasources || [];

      if (datasourcesToUse.length > 0) {
        // Initialize engine (in-memory, no workingDir needed but required by schema)
        const initStartTime = performance.now();
        try {
          await queryEngine.initialize({
            workingDir: 'file://', // Not used for in-memory, but required by schema
            config: {},
          });

          // Load datasources using prioritized list
          const loaded = await loadDatasources(
            datasourcesToUse,
            repositories.datasource,
          );

          // Attach all datasources
          if (loaded.length > 0) {
            const workspace = getWorkspace();
            if (!workspace) {
              throw new Error('WORKSPACE environment variable is not set');
            }
            // DuckDBQueryEngine.attach accepts optional options parameter
            await (queryEngine as QueryEngineWithAttachOptions).attach(
              loaded.map((d) => d.datasource),
              {
                conversationId,
                workspace,
              },
            );
            await queryEngine.connect();
            console.log(
              `[ReadDataAgent] Initialized engine and attached ${loaded.length} datasource(s)`,
            );

            // Load and cache schema metadata immediately after attach
            console.log(
              `[ReadDataAgent] [CACHE] Loading schema cache for ${loaded.length} datasource(s) after attach...`,
            );
            const schemaCache = getSchemaCache(conversationId);

            // Don't invalidate cache - just filter out unattached datasources when building prompt

            // Find uncached datasources (new or not yet cached)
            const uncachedDatasources = loaded.filter(
              ({ datasource }) => !schemaCache.isCached(datasource.id),
            );

            if (uncachedDatasources.length > 0) {
              console.log(
                `[ReadDataAgent] [CACHE] ${uncachedDatasources.length} uncached datasource(s) found, loading metadata...`,
              );
              const cacheLoadStartTime = performance.now();
              const metadata = await queryEngine.metadata(
                uncachedDatasources.map((d) => d.datasource),
              );

              console.log(
                `[ReadDataAgent] [CACHE] Metadata retrieved: ${metadata.tables.length} table(s), ${metadata.columns.length} column(s)`,
              );
              if (metadata.tables.length > 0) {
                console.log(
                  `[ReadDataAgent] [CACHE] Sample tables: ${metadata.tables
                    .slice(0, 5)
                    .map((t) => `${t.schema || 'main'}.${t.name}`)
                    .join(', ')}`,
                );
              }

              // Cache each datasource
              for (const { datasource } of uncachedDatasources) {
                const dbName = getDatasourceDatabaseName(datasource);
                console.log(
                  `[ReadDataAgent] [CACHE] Loading cache for datasource ${datasource.id} (provider: ${datasource.datasource_provider}, dbName: ${dbName})`,
                );
                await schemaCache.loadSchemaForDatasource(
                  datasource.id,
                  metadata,
                  datasource.datasource_provider,
                  dbName,
                );
              }
              const cacheLoadTime = performance.now() - cacheLoadStartTime;
              console.log(
                `[ReadDataAgent] [CACHE] ✓ Cache loaded for ${uncachedDatasources.length} datasource(s) during init in ${cacheLoadTime.toFixed(2)}ms`,
              );
            } else {
              console.log(
                `[ReadDataAgent] [CACHE] ✓ All datasources already cached, skipping load`,
              );
            }
          }
        } catch (_initError) {
          const errorMsg =
            _initError instanceof Error
              ? _initError.message
              : String(_initError);
          console.warn(
            `[ReadDataAgent] Failed to initialize engine or attach datasources:`,
            errorMsg,
          );
          // Continue - engine might already be initialized or datasources might fail individually
        }
        const initTime = performance.now() - initStartTime;
        console.log(
          `[ReadDataAgent] [PERF] Engine initialization and datasource attachment took ${initTime.toFixed(2)}ms (${datasourcesToUse.length} datasources)`,
        );
      } else {
        // Initialize engine even if no datasources (for queries without datasources)
        try {
          await queryEngine.initialize({
            workingDir: 'file://',
            config: {},
          });
          await queryEngine.connect();
        } catch {
          // Engine might already be initialized, ignore error
          console.log(
            `[ReadDataAgent] Engine already initialized or initialization skipped`,
          );
        }
        console.log(
          `[ReadDataAgent] No datasources found in conversation ${conversationId}, engine initialized`,
        );
      }
    } catch (error) {
      // Log but don't fail - datasources might not be available yet
      console.warn(
        `[ReadDataAgent] Failed to initialize engine or datasources:`,
        error,
      );
    }
  }
  const agentInitTime = performance.now() - agentInitStartTime;
  if (agentInitTime > 50) {
    console.log(
      `[ReadDataAgent] [PERF] Agent initialization took ${agentInitTime.toFixed(2)}ms`,
    );
  }

  // Build prompt with attached datasources information
  // Prioritize datasources from message metadata over conversation datasources
  let attachedDatasources: Datasource[] = [];
  let prioritizedDatasourceIds: string[] = [];
  if (repositories && queryEngine) {
    try {
      const getConversationService = new GetConversationBySlugService(
        repositories.conversation,
      );
      const conversation = await getConversationService.execute(conversationId);

      // Prioritize metadata datasources if present, otherwise use conversation datasources
      if (metadataDatasources && metadataDatasources.length > 0) {
        prioritizedDatasourceIds = metadataDatasources;
        console.log(
          `[ReadDataAgent] Using ${prioritizedDatasourceIds.length} datasource(s) from message metadata (prioritized)`,
        );
      } else if (conversation?.datasources?.length) {
        prioritizedDatasourceIds = conversation.datasources;
        console.log(
          `[ReadDataAgent] Using ${prioritizedDatasourceIds.length} datasource(s) from conversation`,
        );
      }

      if (prioritizedDatasourceIds.length > 0) {
        const loaded = await loadDatasources(
          prioritizedDatasourceIds,
          repositories.datasource,
        );
        // Only include datasources that are in the prioritized list
        attachedDatasources = loaded
          .map((d) => d.datasource)
          .filter((ds) => prioritizedDatasourceIds.includes(ds.id));
        console.log(
          `[ReadDataAgent] Loaded ${attachedDatasources.length} datasource(s) for prompt (from ${prioritizedDatasourceIds.length} prioritized)`,
        );
      }
    } catch (error) {
      console.warn(
        '[ReadDataAgent] Failed to load datasources for prompt:',
        error,
      );
    }
  }

  const agentPrompt = buildReadDataAgentPrompt(attachedDatasources);

  const result = new Agent({
    model: await resolveModel(model),
    system: agentPrompt,
    tools: {
      testConnection: tool({
        description:
          'Test the connection to the database to check if the database is accessible',
        inputSchema: z.object({}),
        execute: async () => {
          const workspace = getWorkspace();
          if (!workspace) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const dbPath = join(workspace, conversationId, 'database.db');
          // testConnection still uses dbPath directly, which is fine for testing
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

          console.log(
            `[ReadDataAgent] getSchema called${
              requestedViews
                ? ` for ${requestedViews.length} view(s): ${requestedViews.join(', ')}`
                : ' (all views)'
            }`,
          );

          if (!queryEngine) {
            throw new Error('Query engine not available');
          }

          const workspace = getWorkspace();
          if (!workspace) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const fileDir = join(workspace, conversationId);
          const dbPath = join(fileDir, 'database.duckdb');

          console.log(
            `[ReadDataAgent] Workspace: ${workspace}, ConversationId: ${conversationId}, dbPath: ${dbPath}`,
          );

          // Get schema cache for this conversation
          console.log(
            `[ReadDataAgent] [CACHE] getSchema called, checking cache...`,
          );
          const schemaCache = getSchemaCache(conversationId);

          // Get datasources info (only if needed for uncached datasources)
          let allDatasources: Array<{
            datasource: import('@qwery/domain/entities').Datasource;
          }> = [];

          // Track sync time (will be 0 if all datasources are cached)
          const syncStartTime = performance.now();
          let syncTime = 0;

          // Check if we need to sync datasources (only if there are uncached ones)
          if (repositories) {
            try {
              const getConversationService = new GetConversationBySlugService(
                repositories.conversation,
              );
              const conversation =
                await getConversationService.execute(conversationId);

              // Use prioritized datasources (metadata > conversation)
              const datasourcesToUse =
                metadataDatasources && metadataDatasources.length > 0
                  ? metadataDatasources
                  : conversation?.datasources || [];

              if (datasourcesToUse.length > 0) {
                allDatasources = await loadDatasources(
                  datasourcesToUse,
                  repositories.datasource,
                );

                // Check for datasource changes - invalidate cache for removed datasources
                const cachedDatasourceIds = schemaCache.getDatasources();
                const currentDatasourceIds = new Set(
                  allDatasources.map((d) => d.datasource.id),
                );

                // Remove cache entries for datasources no longer attached
                for (const cachedId of cachedDatasourceIds) {
                  if (!currentDatasourceIds.has(cachedId)) {
                    console.log(
                      `[ReadDataAgent] [CACHE] Datasource ${cachedId} no longer attached, invalidating cache`,
                    );
                    schemaCache.invalidate(cachedId);
                  }
                }

                // Check if any datasources are uncached or if datasources changed
                const uncachedDatasources = allDatasources.filter(
                  ({ datasource }) => !schemaCache.isCached(datasource.id),
                );

                // Force refresh if metadata datasources differ from cached
                const hasMetadataDatasources =
                  metadataDatasources && metadataDatasources.length > 0;
                const metadataDiffers =
                  hasMetadataDatasources &&
                  metadataDatasources.some((id) => !schemaCache.isCached(id));

                // Only sync if there are uncached datasources or metadata differs
                if (uncachedDatasources.length > 0 || metadataDiffers) {
                  console.log(
                    `[ReadDataAgent] [CACHE] ✗ ${uncachedDatasources.length} uncached datasource(s) found${metadataDiffers ? ' (metadata differs)' : ''}, syncing and loading cache...`,
                  );
                  const syncStartTime = performance.now();

                  // Attach all datasources (engine handles deduplication)
                  const workspace = getWorkspace();
                  if (!workspace) {
                    throw new Error(
                      'WORKSPACE environment variable is not set',
                    );
                  }
                  // DuckDBQueryEngine.attach accepts optional options parameter
                  // CRITICAL: Must await attach to ensure tables are created before querying metadata
                  await (queryEngine as QueryEngineWithAttachOptions).attach(
                    allDatasources.map((d) => d.datasource),
                    {
                      conversationId,
                      workspace,
                    },
                  );

                  // Load and cache metadata for uncached datasources
                  // Tables are now guaranteed to exist after await attach
                  const cacheLoadStartTime = performance.now();
                  const metadata = await queryEngine.metadata(
                    uncachedDatasources.map((d) => d.datasource),
                  );

                  // Cache each datasource
                  for (const { datasource } of uncachedDatasources) {
                    const dbName = getDatasourceDatabaseName(datasource);
                    await schemaCache.loadSchemaForDatasource(
                      datasource.id,
                      metadata,
                      datasource.datasource_provider,
                      dbName,
                    );
                  }
                  const cacheLoadTime = performance.now() - cacheLoadStartTime;
                  syncTime = performance.now() - syncStartTime;
                  console.log(
                    `[ReadDataAgent] [CACHE] ✓ Sync and cache load completed in ${syncTime.toFixed(2)}ms (cache: ${cacheLoadTime.toFixed(2)}ms)`,
                  );
                } else {
                  // All datasources are cached, get datasource IDs from cache
                  syncTime = performance.now() - syncStartTime;
                  console.log(
                    `[ReadDataAgent] [CACHE] ✓ All datasources cached, skipping expensive sync (${syncTime.toFixed(2)}ms)`,
                  );
                }
              }
            } catch (error) {
              console.warn(
                '[ReadDataAgent] Failed to sync datasources:',
                error,
              );
            }
          } else {
            syncTime = performance.now() - syncStartTime;
          }

          // Get metadata from cache or query engine
          const schemaDiscoveryStartTime = performance.now();
          let schemaDiscoveryTime = 0;
          let collectedSchemas: Map<string, SimpleSchema> = new Map();

          try {
            // If we don't have allDatasources yet (because we skipped sync), load them for cache lookup
            if (allDatasources.length === 0 && repositories) {
              try {
                const getConversationService = new GetConversationBySlugService(
                  repositories.conversation,
                );
                const conversation =
                  await getConversationService.execute(conversationId);
                if (conversation?.datasources?.length) {
                  allDatasources = await loadDatasources(
                    conversation.datasources,
                    repositories.datasource,
                  );
                }
              } catch (error) {
                console.warn(
                  '[ReadDataAgent] Failed to load datasources for cache lookup:',
                  error,
                );
              }
            }

            // Check if we can use cache
            const allCached =
              allDatasources.length > 0 &&
              allDatasources.every(({ datasource }) =>
                schemaCache.isCached(datasource.id),
              );

            if (allCached && allDatasources.length > 0) {
              // Use cache - get all schemas (filtering by requestedViews happens below)
              console.log(
                `[ReadDataAgent] [CACHE] ✓ Using cached schema for ${allDatasources.length} datasource(s)`,
              );
              collectedSchemas = schemaCache.toSimpleSchemas(
                allDatasources.map((d) => d.datasource.id),
              );
              schemaDiscoveryTime =
                performance.now() - schemaDiscoveryStartTime;
              console.log(
                `[ReadDataAgent] [CACHE] ✓ Schema retrieved from cache in ${schemaDiscoveryTime.toFixed(2)}ms (${collectedSchemas.size} schema(s))`,
              );
            } else {
              console.log(
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
              console.log(
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
              console.log(
                `[ReadDataAgent] [PERF] transformMetadataToSimpleSchema took ${transformTime.toFixed(2)}ms`,
              );
              schemaDiscoveryTime =
                performance.now() - schemaDiscoveryStartTime;
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
                  console.warn(
                    `[ReadDataAgent] View "${viewId}" not found in metadata, skipping`,
                  );
                }
              }
              collectedSchemas = filteredSchemas;
            }

            schemaDiscoveryTime = performance.now() - schemaDiscoveryStartTime;
            console.log(
              `[ReadDataAgent] [PERF] Total schema discovery took ${schemaDiscoveryTime.toFixed(2)}ms`,
            );
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            console.error(
              `[ReadDataAgent] Failed to get metadata: ${errorMsg}`,
              error,
            );
            throw error;
          }

          // Get performance configuration
          const perfConfigStartTime = performance.now();
          const perfConfig = await getConfig(fileDir);
          const perfConfigTime = performance.now() - perfConfigStartTime;
          console.log(
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
              console.log(
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
                console.debug(
                  `[ReadDataAgent] Skipping system table in context building: ${vName}`,
                );
                continue;
              }

              // Also check if schema has any valid tables
              const hasValidTables = vSchema.tables.some(
                (t) => !isSystemOrTempTable(t.tableName),
              );
              if (!hasValidTables) {
                console.debug(
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
              console.log(
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
            console.log(
              `[ReadDataAgent] [PERF] mergeBusinessContexts (${fastContexts.length} contexts) took ${mergeTime.toFixed(2)}ms`,
            );
          }
          const contextTime = performance.now() - contextStartTime;
          console.log(
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
          console.log(
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
        execute: async ({ query }) => {
          // Use promptSource, needSQL, and needChart from context (passed to readDataAgent function)
          // needSQL comes from intent.needsSQL, needChart from intent.needsChart

          // TEMPORARY OVERRIDE: When needChart is true AND inline mode, execute query for chart generation
          // but still return SQL for pasting to notebook
          const isChartRequestInInlineMode =
            needChart === true &&
            promptSource === PROMPT_SOURCE.INLINE &&
            needSQL === true;

          // Normal inline mode: skip execution, return SQL for pasting
          const shouldSkipExecution =
            promptSource === PROMPT_SOURCE.INLINE &&
            needSQL === true &&
            !isChartRequestInInlineMode;

          console.log('[runQuery] Tool execution:', {
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
            console.log(
              '[runQuery] Skipping execution - SQL will be pasted to notebook cell',
            );
            return {
              result: null,
              shouldPaste: true,
              sqlQuery: query,
            };
          }

          // For chart requests in inline mode, we'll execute but still return SQL for pasting
          if (isChartRequestInInlineMode) {
            console.log(
              '[runQuery] Executing query for chart generation (inline mode override)',
            );
          } else {
            console.log('[runQuery] Executing query normally');
          }

          // Normal execution path for chat mode or when needSQL is false
          const startTime = performance.now();

          if (!queryEngine) {
            throw new Error('Query engine not available');
          }

          // Validate that query only references attached datasources
          if (repositories) {
            try {
              const getConversationService = new GetConversationBySlugService(
                repositories.conversation,
              );
              const conversation =
                await getConversationService.execute(conversationId);

              // Use prioritized datasources (metadata > conversation)
              const datasourcesToUse =
                metadataDatasources && metadataDatasources.length > 0
                  ? metadataDatasources
                  : conversation?.datasources || [];

              if (datasourcesToUse.length > 0) {
                const loaded = await loadDatasources(
                  datasourcesToUse,
                  repositories.datasource,
                );

                // Get attached datasource database names
                const attachedDbNames = new Set(
                  loaded.map((d) => getDatasourceDatabaseName(d.datasource)),
                );

                // Extract table references from SQL query (simple regex-based extraction)
                // Match patterns like: FROM datasource.table, JOIN datasource.schema.table, etc.
                const tablePattern =
                  /(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)?)/gi;
                const matches = query.matchAll(tablePattern);
                const referencedTables = new Set<string>();

                for (const match of matches) {
                  const tableRef = match[1];
                  if (!tableRef) continue;
                  // Extract datasource name (first part before dot)
                  const parts = tableRef.split('.');
                  if (parts.length >= 1 && parts[0]) {
                    const datasourceName = parts[0];
                    referencedTables.add(datasourceName);
                  }
                }

                // Check if all referenced datasources are attached
                const invalidDatasources = Array.from(referencedTables).filter(
                  (dbName) => !attachedDbNames.has(dbName),
                );

                if (invalidDatasources.length > 0) {
                  throw new Error(
                    `Query references unattached datasources: ${invalidDatasources.join(', ')}. Only these datasources are attached: ${Array.from(attachedDbNames).join(', ')}`,
                  );
                }
              }
            } catch (error) {
              // If validation fails, log but don't block execution (query engine will handle errors)
              if (
                error instanceof Error &&
                error.message.includes('unattached datasources')
              ) {
                throw error; // Re-throw validation errors
              }
              console.warn(
                '[runQuery] Datasource validation failed, continuing with query execution:',
                error,
              );
            }
          }

          // Sync datasources before querying if repositories available
          // Only sync if there are uncached datasources (cache is loaded during agent init)
          const syncStartTime = performance.now();
          let syncTime = 0;
          if (repositories) {
            try {
              const schemaCache = getSchemaCache(conversationId);
              const getConversationService = new GetConversationBySlugService(
                repositories.conversation,
              );
              const conversation =
                await getConversationService.execute(conversationId);

              // Use prioritized datasources (metadata > conversation)
              const datasourcesToUse =
                metadataDatasources && metadataDatasources.length > 0
                  ? metadataDatasources
                  : conversation?.datasources || [];

              if (datasourcesToUse.length > 0) {
                // Load all datasources
                const loaded = await loadDatasources(
                  datasourcesToUse,
                  repositories.datasource,
                );

                // Check for datasource changes - invalidate cache for removed datasources
                const cachedDatasourceIds = schemaCache.getDatasources();
                const currentDatasourceIds = new Set(
                  loaded.map((d) => d.datasource.id),
                );

                // Remove cache entries for datasources no longer attached
                for (const cachedId of cachedDatasourceIds) {
                  if (!currentDatasourceIds.has(cachedId)) {
                    console.log(
                      `[ReadDataAgent] [CACHE] Datasource ${cachedId} no longer attached in runQuery, invalidating cache`,
                    );
                    schemaCache.invalidate(cachedId);
                  }
                }

                // Check which datasources need to be cached
                const uncachedDatasources = loaded.filter(
                  ({ datasource }) => !schemaCache.isCached(datasource.id),
                );

                // Only sync if there are uncached datasources
                if (uncachedDatasources.length > 0) {
                  console.log(
                    `[ReadDataAgent] [CACHE] ✗ ${uncachedDatasources.length} uncached datasource(s) in runQuery, loading cache...`,
                  );
                  // Attach all datasources (engine handles deduplication)
                  const workspace = getWorkspace();
                  if (!workspace) {
                    throw new Error(
                      'WORKSPACE environment variable is not set',
                    );
                  }
                  // DuckDBQueryEngine.attach accepts optional options parameter
                  await (queryEngine as QueryEngineWithAttachOptions).attach(
                    loaded.map((d) => d.datasource),
                    {
                      conversationId,
                      workspace,
                    },
                  );

                  // Load and cache metadata for uncached datasources
                  const metadata = await queryEngine.metadata(
                    uncachedDatasources.map((d) => d.datasource),
                  );

                  // Cache each datasource
                  for (const { datasource } of uncachedDatasources) {
                    const dbName = getDatasourceDatabaseName(datasource);
                    await schemaCache.loadSchemaForDatasource(
                      datasource.id,
                      metadata,
                      datasource.datasource_provider,
                      dbName,
                    );
                  }
                  console.log(
                    `[ReadDataAgent] [CACHE] ✓ Cache loaded for ${uncachedDatasources.length} datasource(s) in runQuery`,
                  );
                } else {
                  // All datasources are cached, just ensure they're attached (engine handles deduplication)
                  console.log(
                    `[ReadDataAgent] [CACHE] ✓ All datasources cached in runQuery, skipping metadata load`,
                  );
                  const workspace = getWorkspace();
                  if (!workspace) {
                    throw new Error(
                      'WORKSPACE environment variable is not set',
                    );
                  }
                  // DuckDBQueryEngine.attach accepts optional options parameter
                  await (queryEngine as QueryEngineWithAttachOptions).attach(
                    loaded.map((d) => d.datasource),
                    {
                      conversationId,
                      workspace,
                    },
                  );
                }
              }
            } catch (error) {
              console.warn(
                '[ReadDataAgent] Failed to sync datasources before query:',
                error,
              );
            }
          }
          syncTime = performance.now() - syncStartTime;
          if (syncTime > 10) {
            console.log(
              `[ReadDataAgent] [PERF] runQuery syncDatasources took ${syncTime.toFixed(2)}ms`,
            );
          }

          // Validate that all table paths in the query exist in attached datasources
          if (repositories) {
            try {
              const schemaCache = getSchemaCache(conversationId);
              const { extractTablePathsFromQuery } = await import(
                '../../tools/validate-table-paths'
              );
              const tablePaths = extractTablePathsFromQuery(query);
              const allAvailablePaths =
                schemaCache.getAllTablePathsFromAllDatasources();
              const missingTables: string[] = [];

              for (const tablePath of tablePaths) {
                // Check if table exists in cache
                if (
                  !schemaCache.hasTablePath(tablePath) &&
                  !allAvailablePaths.includes(tablePath)
                ) {
                  // Also check if it's a simple table name that might be in main database
                  const isSimpleName = !tablePath.includes('.');
                  if (!isSimpleName) {
                    missingTables.push(tablePath);
                  }
                }
              }

              if (missingTables.length > 0) {
                const availablePaths = allAvailablePaths
                  .slice(0, 20)
                  .join(', ');
                throw new Error(
                  `The following tables are not available in attached datasources: ${missingTables.join(', ')}. Available tables: ${availablePaths}${allAvailablePaths.length > 20 ? '...' : ''}. Please check the attached datasources list and use only tables that exist.`,
                );
              }
            } catch (error) {
              // If validation fails with our custom error, throw it
              if (
                error instanceof Error &&
                error.message.includes('not available in attached datasources')
              ) {
                throw error;
              }
              // Otherwise, log warning but continue (might be a complex query we can't parse)
              console.warn(
                '[ReadDataAgent] Failed to validate table paths in query:',
                error,
              );
            }
          }

          const queryStartTime = performance.now();
          const result = await queryEngine.query(query);
          const queryTime = performance.now() - queryStartTime;
          const totalTime = performance.now() - startTime;
          console.log(
            `[ReadDataAgent] [PERF] runQuery TOTAL took ${totalTime.toFixed(2)}ms (sync: ${syncTime.toFixed(2)}ms, query: ${queryTime.toFixed(2)}ms, rows: ${result.rows.length})`,
          );

          // Store full results in cache to avoid injecting into agent context
          const columnNames = result.columns.map((col) =>
            typeof col === 'string' ? col : col.name || String(col),
          );
          const queryId = storeQueryResult(
            conversationId,
            query,
            columnNames,
            result.rows,
          );

          // Return full results for UI display, but agent should use queryId to avoid token waste
          // The prompt instructs the agent to ignore the full results and only use queryId
          const fullResult = {
            columns: columnNames,
            rows: result.rows,
          };

          if (isChartRequestInInlineMode) {
            // Chart request in inline mode: return full results + SQL for pasting
            return {
              result: fullResult,
              shouldPaste: true,
              sqlQuery: query,
              chartExecutionOverride: true,
              queryId, // Agent should use this, not the full results
            };
          }

          // Return full results for UI display
          // Agent prompt instructs to ignore full results and use queryId instead
          return {
            result: fullResult,
            queryId, // Agent should use this to retrieve results for tools
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
          const result = await renameTable({
            oldTableName,
            newTableName,
            queryEngine,
          });
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
          const result = await deleteTable({
            tableNames,
            queryEngine,
          });
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
              console.log(
                `[selectChartType] Retrieved full results from cache: ${cachedResult.rows.length} rows`,
              );
            } else {
              console.warn(
                `[selectChartType] Query result not found in cache: ${queryId}, using provided queryResults`,
              );
            }
          }

          if (!fullQueryResults) {
            throw new Error('Either queryId or queryResults must be provided');
          }
          const workspace = getWorkspace();
          if (!workspace) {
            throw new Error('WORKSPACE environment variable is not set');
          }
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
              console.log(
                `[generateChart] Retrieved full results from cache: ${cachedResult.rows.length} rows`,
              );
            } else {
              console.warn(
                `[generateChart] Query result not found in cache: ${queryId}, using provided queryResults`,
              );
            }
          }

          if (!fullQueryResults) {
            throw new Error('Either queryId or queryResults must be provided');
          }
          const startTime = performance.now();
          const workspace = getWorkspace();
          if (!workspace) {
            throw new Error('WORKSPACE environment variable is not set');
          }
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
            console.log(
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
          console.log(
            `[ReadDataAgent] [PERF] generateChart TOTAL took ${totalTime.toFixed(2)}ms (context: ${contextTime.toFixed(2)}ms, generate: ${generateTime.toFixed(2)}ms)`,
          );
          return result;
        },
      }),
    },
    stopWhen: stepCountIs(20),
  });

  return result.stream({
    messages: convertToModelMessages(await validateUIMessages({ messages })),
    providerOptions: {
      openai: {
        reasoningSummary: 'auto', // 'auto' for condensed or 'detailed' for comprehensive
        reasoningEffort: 'medium',
        reasoningDetailedSummary: true,
        reasoningDetailedSummaryLength: 'long',
      },
    },
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
    console.log('[readDataAgentActor] Received input:', {
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
