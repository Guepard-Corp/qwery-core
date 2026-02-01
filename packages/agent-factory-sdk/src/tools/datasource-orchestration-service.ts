import type { Repositories } from '@qwery/domain/repositories';
import { GetConversationBySlugService } from '@qwery/domain/services';
import type { AbstractQueryEngine } from '@qwery/domain/ports';
import { loadDatasources, type LoadedDatasource } from './datasource-loader';
import { getSchemaCache, type SchemaCacheManager } from './schema-cache';
import { getDatasourceDatabaseName } from './datasource-name-utils';
import type { ConversationOutput } from '@qwery/domain/usecases';
import { getLogger } from '@qwery/shared/logger';

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
  /** Conversation UUID; used for schema cache and attach. */
  conversationId: string;
  /** Conversation slug; used to load conversation (GetConversationBySlugService). If omitted, conversationId is passed to the slug service (may fail if id is not a slug). */
  conversationSlug?: string;
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
    const {
      conversationId,
      conversationSlug,
      repositories,
      queryEngine,
      metadataDatasources,
    } = options;

    const workspace = getWorkspace();
    if (!workspace) {
      throw new Error('WORKSPACE environment variable is not set');
    }

    const slugToLoad = conversationSlug ?? conversationId;
    const getConversationService = new GetConversationBySlugService(
      repositories.conversation,
    );
    let conversation: ConversationOutput | null = null;
    try {
      conversation = await getConversationService.execute(slugToLoad);
    } catch (error) {
      const logger = await getLogger();
      logger.warn(
        `[DatasourceOrchestration] Conversation ${slugToLoad} not found:`,
        error,
      );
    }

    const datasourcesToUse = prioritizeDatasources(
      metadataDatasources,
      conversation?.datasources,
    );

    const schemaCache = getSchemaCache(conversationId);

    let attached = false;
    if (datasourcesToUse.length > 0) {
      try {
        await queryEngine.initialize({
          workingDir: 'file://',
          config: {},
        });

        const loaded = await loadDatasources(
          datasourcesToUse,
          repositories.datasource,
        );

        if (loaded.length > 0) {
          // Attach all datasources (will continue on individual failures)
          // attach() now processes all datasources and logs errors without throwing
          await queryEngine.attach(
            loaded.map((d) => d.datasource),
            {
              conversationId,
              workspace,
            },
          );
          await queryEngine.connect();
          attached = true;
          const logger = await getLogger();
          logger.debug(
            `[DatasourceOrchestration] Initialized engine and processed ${loaded.length} datasource(s) (some may have failed - check logs)`,
          );

          logger.debug(
            `[DatasourceOrchestration] [CACHE] Loading schema cache for ${loaded.length} datasource(s) after attach...`,
          );

          const uncachedDatasources = loaded.filter(
            ({ datasource }) => !schemaCache.isCached(datasource.id),
          );

          if (uncachedDatasources.length > 0) {
            logger.debug(
              `[DatasourceOrchestration] [CACHE] ${uncachedDatasources.length} uncached datasource(s) found, loading metadata...`,
            );
            const cacheLoadStartTime = performance.now();
            const metadata = await queryEngine.metadata(
              uncachedDatasources.map((d) => d.datasource),
            );

            logger.debug(
              `[DatasourceOrchestration] [CACHE] Metadata retrieved: ${metadata.tables.length} table(s), ${metadata.columns.length} column(s)`,
            );

            for (const { datasource } of uncachedDatasources) {
              const dbName = getDatasourceDatabaseName(datasource);
              logger.debug(
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
            logger.debug(
              `[DatasourceOrchestration] [CACHE] ✓ Cache loaded for ${uncachedDatasources.length} datasource(s) during init in ${cacheLoadTime.toFixed(2)}ms`,
            );
          } else {
            logger.debug(
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
        const errorMsg = error instanceof Error ? error.message : String(error);
        const logger = await getLogger();
        logger.warn(
          `[DatasourceOrchestration] Failed to initialize engine or attach datasources:`,
          errorMsg,
        );
      }
    } else {
      try {
        await queryEngine.initialize({
          workingDir: 'file://',
          config: {},
        });
        await queryEngine.connect();
      } catch {
        const logger = await getLogger();
        logger.debug(
          `[DatasourceOrchestration] Engine already initialized or initialization skipped`,
        );
      }
      const logger = await getLogger();
      logger.debug(
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

    if (existingResult) {
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

        const cachedDatasourceIds = schemaCache.getDatasources();
        const currentDatasourceIds = new Set(
          loaded.map((d) => d.datasource.id),
        );

        for (const cachedId of cachedDatasourceIds) {
          if (!currentDatasourceIds.has(cachedId)) {
            const logger = await getLogger();
            logger.debug(
              `[DatasourceOrchestration] [CACHE] Datasource ${cachedId} no longer attached, invalidating cache`,
            );
            schemaCache.invalidate(cachedId);
          }
        }

        const uncachedDatasources = loaded.filter(
          ({ datasource }) => !schemaCache.isCached(datasource.id),
        );

        // Force refresh if metadata datasources differ from cached
        const hasMetadataDatasources =
          metadataDatasources && metadataDatasources.length > 0;
        const metadataDiffers =
          hasMetadataDatasources &&
          metadataDatasources.some((id) => !schemaCache.isCached(id));

        if (uncachedDatasources.length > 0 || metadataDiffers) {
          const logger = await getLogger();
          logger.debug(
            `[DatasourceOrchestration] [CACHE] ✗ ${uncachedDatasources.length} uncached datasource(s) found${metadataDiffers ? ' (metadata differs)' : ''}, syncing and loading cache...`,
          );

          await queryEngine.attach(
            loaded.map((d) => d.datasource),
            {
              conversationId,
              workspace: existingResult.workspace,
            },
          );

          const metadata = await queryEngine.metadata(
            uncachedDatasources.map((d) => d.datasource),
          );

          for (const { datasource } of uncachedDatasources) {
            const dbName = getDatasourceDatabaseName(datasource);
            await schemaCache.loadSchemaForDatasource(
              datasource.id,
              metadata,
              datasource.datasource_provider,
              dbName,
            );
          }
          logger.debug(
            `[DatasourceOrchestration] [CACHE] ✓ Sync and cache load completed`,
          );
        } else {
          const logger = await getLogger();
          logger.debug(
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

    return this.orchestrate(options);
  }
}

// Export singleton instance
export const datasourceOrchestrationService =
  new DatasourceOrchestrationService();
