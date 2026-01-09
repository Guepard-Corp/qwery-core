import type { Repositories } from '@qwery/domain/repositories';
import { GetConversationBySlugService } from '@qwery/domain/services';
import type { AbstractQueryEngine } from '@qwery/domain/ports';
import { loadDatasources, type LoadedDatasource } from './datasource-loader';
import { getSchemaCache, type SchemaCacheManager } from './schema-cache';
import { getDatasourceDatabaseName } from './datasource-name-utils';
import type { ConversationOutput } from '@qwery/domain/usecases';

// Lazy workspace resolution - only resolve when actually needed
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
 * Prioritize datasources: metadata datasources take precedence over conversation datasources
 */
export function prioritizeDatasources(
  metadataDatasources?: string[],
  conversationDatasources?: string[],
): string[] {
  if (metadataDatasources && metadataDatasources.length > 0) {
    return metadataDatasources;
  }
  return conversationDatasources || [];
}

export interface DatasourceOrchestrationResult {
  conversation: ConversationOutput | null;
  datasources: LoadedDatasource[];
  workspace: string;
  schemaCache: SchemaCacheManager;
  attached: boolean;
}

export interface DatasourceOrchestrationOptions {
  conversationId: string;
  repositories: Repositories;
  queryEngine: AbstractQueryEngine;
  metadataDatasources?: string[];
}

/**
 * Unified service for orchestrating datasource operations:
 * - Conversation retrieval
 * - Datasource loading and prioritization
 * - Attachment coordination
 * - Schema cache management
 * - Workspace resolution
 */
export class DatasourceOrchestrationService {
  /**
   * Orchestrate all datasource operations for agent initialization
   */
  async orchestrate(
    options: DatasourceOrchestrationOptions,
  ): Promise<DatasourceOrchestrationResult> {
    const { conversationId, repositories, queryEngine, metadataDatasources } =
      options;

    // Resolve workspace once
    const workspace = getWorkspace();
    if (!workspace) {
      throw new Error('WORKSPACE environment variable is not set');
    }

    // Get conversation
    const getConversationService = new GetConversationBySlugService(
      repositories.conversation,
    );
    let conversation: ConversationOutput | null = null;
    try {
      conversation = await getConversationService.execute(conversationId);
    } catch (error) {
      // Conversation might not exist yet, continue with null
      console.warn(
        `[DatasourceOrchestration] Conversation ${conversationId} not found:`,
        error,
      );
    }

    // Prioritize datasources
    const datasourcesToUse = prioritizeDatasources(
      metadataDatasources,
      conversation?.datasources,
    );

    // Get schema cache
    const schemaCache = getSchemaCache(conversationId);

    // Initialize engine if not already initialized
    let attached = false;
    if (datasourcesToUse.length > 0) {
      try {
        // Initialize engine (in-memory, no workingDir needed but required by schema)
        await queryEngine.initialize({
          workingDir: 'file://', // Not used for in-memory, but required by schema
          config: {},
        });

        // Load datasources
        const loaded = await loadDatasources(
          datasourcesToUse,
          repositories.datasource,
        );

        // Attach all datasources
        if (loaded.length > 0) {
          await queryEngine.attach(
            loaded.map((d) => d.datasource),
            {
              conversationId,
              workspace,
            },
          );
          await queryEngine.connect();
          attached = true;
          console.log(
            `[DatasourceOrchestration] Initialized engine and attached ${loaded.length} datasource(s)`,
          );

          // Load and cache schema metadata immediately after attach
          console.log(
            `[DatasourceOrchestration] [CACHE] Loading schema cache for ${loaded.length} datasource(s) after attach...`,
          );

          // Find uncached datasources (new or not yet cached)
          const uncachedDatasources = loaded.filter(
            ({ datasource }) => !schemaCache.isCached(datasource.id),
          );

          if (uncachedDatasources.length > 0) {
            console.log(
              `[DatasourceOrchestration] [CACHE] ${uncachedDatasources.length} uncached datasource(s) found, loading metadata...`,
            );
            const cacheLoadStartTime = performance.now();
            const metadata = await queryEngine.metadata(
              uncachedDatasources.map((d) => d.datasource),
            );

            console.log(
              `[DatasourceOrchestration] [CACHE] Metadata retrieved: ${metadata.tables.length} table(s), ${metadata.columns.length} column(s)`,
            );

            // Cache each datasource
            for (const { datasource } of uncachedDatasources) {
              const dbName = getDatasourceDatabaseName(datasource);
              console.log(
                `[DatasourceOrchestration] [CACHE] Loading cache for datasource ${datasource.id} (provider: ${datasource.datasource_provider}, dbName: ${dbName})`,
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
              `[DatasourceOrchestration] [CACHE] ✓ Cache loaded for ${uncachedDatasources.length} datasource(s) during init in ${cacheLoadTime.toFixed(2)}ms`,
            );
          } else {
            console.log(
              `[DatasourceOrchestration] [CACHE] ✓ All datasources already cached, skipping load`,
            );
          }

          return {
            conversation,
            datasources: loaded,
            workspace,
            schemaCache,
            attached: true,
          };
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[DatasourceOrchestration] Failed to initialize engine or attach datasources:`,
          errorMsg,
        );
        // Continue - engine might already be initialized or datasources might fail individually
      }
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
          `[DatasourceOrchestration] Engine already initialized or initialization skipped`,
        );
      }
      console.log(
        `[DatasourceOrchestration] No datasources found in conversation ${conversationId}, engine initialized`,
      );
    }

    return {
      conversation,
      datasources: [],
      workspace,
      schemaCache,
      attached,
    };
  }

  /**
   * Ensure datasources are attached and cached (for tools that need to sync)
   */
  async ensureAttachedAndCached(
    options: DatasourceOrchestrationOptions,
    existingResult?: DatasourceOrchestrationResult,
  ): Promise<DatasourceOrchestrationResult> {
    const { conversationId, repositories, queryEngine, metadataDatasources } =
      options;

    // Use existing result if provided and still valid
    if (existingResult) {
      // Check if we need to sync (uncached datasources or metadata differs)
      const schemaCache = existingResult.schemaCache;
      const datasourcesToUse = prioritizeDatasources(
        metadataDatasources,
        existingResult.conversation?.datasources,
      );

      if (datasourcesToUse.length > 0) {
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
              `[DatasourceOrchestration] [CACHE] Datasource ${cachedId} no longer attached, invalidating cache`,
            );
            schemaCache.invalidate(cachedId);
          }
        }

        // Check if any datasources are uncached
        const uncachedDatasources = loaded.filter(
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
            `[DatasourceOrchestration] [CACHE] ✗ ${uncachedDatasources.length} uncached datasource(s) found${metadataDiffers ? ' (metadata differs)' : ''}, syncing and loading cache...`,
          );

          // Attach all datasources (engine handles deduplication)
          await queryEngine.attach(
            loaded.map((d) => d.datasource),
            {
              conversationId,
              workspace: existingResult.workspace,
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
            `[DatasourceOrchestration] [CACHE] ✓ Sync and cache load completed`,
          );
        } else {
          // All datasources are cached, just ensure they're attached (engine handles deduplication)
          console.log(
            `[DatasourceOrchestration] [CACHE] ✓ All datasources cached, ensuring attachment`,
          );
          const loaded = await loadDatasources(
            datasourcesToUse,
            repositories.datasource,
          );
          await queryEngine.attach(
            loaded.map((d) => d.datasource),
            {
              conversationId,
              workspace: existingResult.workspace,
            },
          );
        }

        return {
          ...existingResult,
          datasources: loaded,
        };
      }
    }

    // If no existing result, do full orchestration
    return this.orchestrate(options);
  }
}

// Export singleton instance
export const datasourceOrchestrationService = new DatasourceOrchestrationService();
