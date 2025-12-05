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
import { gsheetToDuckdb } from '../../tools/gsheet-to-duckdb';
import {
  extractSchema,
  extractSchemasParallel,
} from '../../tools/extract-schema';
import type { SimpleSchema } from '@qwery/domain/entities';
import { runQuery } from '../../tools/run-query';
import {
  registerSheetView,
  loadViewRegistry,
  updateViewUsage,
  generateSemanticViewName,
  validateViewExists,
  validateTableExists,
  dropTable,
  createViewFromTable,
  withRetry,
  formatViewCreationError,
  cleanupOrphanedTempTables,
  type RegistryContext,
} from '../../tools/view-registry';
import { READ_DATA_AGENT_PROMPT } from '../prompts/read-data-agent.prompt';
import type { BusinessContext } from '../../tools/types/business-context.types';
import { mergeBusinessContexts } from '../../tools/utils/business-context.storage';
import { getConfig } from '../../tools/utils/business-context.config';
import { buildBusinessContext } from '../../tools/build-business-context';
import { enhanceBusinessContextInBackground } from './enhance-business-context.actor';

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

export const readDataAgent = async (
  conversationId: string,
  messages: UIMessage[],
) => {
  // Cache for view list to avoid redundant calls
  let cachedViews: Awaited<ReturnType<typeof loadViewRegistry>> | null = null;

  const result = new Agent({
    model: await resolveModel('azure/gpt-5-mini'),
    system: READ_DATA_AGENT_PROMPT,
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
          const result = await testConnection({
            dbPath: dbPath,
          });
          return result.toString();
        },
      }),
      createDbViewFromSheet: tool({
        description:
          'Create a View from a Google Sheet. Can handle single or multiple sheets. IMPORTANT: Only use this when the user explicitly provides NEW Google Sheet URLs that are not already in the registry. Always call listViews first to check if sheets already exist.',
        inputSchema: z.object({
          sharedLink: z.union([z.string(), z.array(z.string())]),
        }),
        execute: async ({ sharedLink }) => {
          const workspace = getWorkspace();
          if (!workspace) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const { mkdir } = await import('node:fs/promises');
          await mkdir(workspace, { recursive: true });
          const fileDir = join(workspace, conversationId);
          await mkdir(fileDir, { recursive: true });
          const dbPath = join(fileDir, 'database.db');

          // Cleanup orphaned temp tables on startup
          await cleanupOrphanedTempTables(dbPath);

          const context: RegistryContext = {
            conversationDir: fileDir,
          };

          // Handle single or multiple links
          const links = Array.isArray(sharedLink) ? sharedLink : [sharedLink];
          const results: Array<{
            success: boolean;
            viewName?: string;
            displayName?: string;
            error?: string;
            link: string;
          }> = [];

          // Process sequentially to avoid race conditions
          for (const link of links) {
            try {
              const result = await withRetry(
                async () => {
                  // Check if view already exists
                  const existing = await loadViewRegistry(context);
                  const sourceId = link.match(
                    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
                  )?.[1];
                  const existingRecord = sourceId
                    ? existing.find((rec) => rec.sourceId === sourceId)
                    : null;

                  if (existingRecord) {
                    // Validate view exists in database
                    const exists = await validateTableExists(
                      dbPath,
                      existingRecord.viewName,
                    );
                    if (!exists) {
                      // View in registry but not in DB - recreate it
                      console.debug(
                        `[ReadDataAgent:${conversationId}] View in registry but missing in DB, recreating: ${existingRecord.viewName}`,
                      );
                      await gsheetToDuckdb({
                        dbPath,
                        sharedLink: link,
                        viewName: existingRecord.viewName,
                      });
                      // Validate it was created
                      const recreated = await validateTableExists(
                        dbPath,
                        existingRecord.viewName,
                      );
                      if (!recreated) {
                        throw new Error('Failed to recreate view in database');
                      }
                    }

                    return {
                      viewName: existingRecord.viewName,
                      displayName:
                        existingRecord.displayName || existingRecord.viewName,
                      sharedLink: existingRecord.sharedLink,
                    };
                  }

                  // Generate unique temp table name
                  const tempViewName = `temp_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 8)}`;

                  let finalViewName: string | null = null;

                  try {
                    // Step 1: Create temp view in database
                    console.debug(
                      `[ReadDataAgent:${conversationId}] Creating DuckDB view from sheet: ${link}`,
                    );

                    await gsheetToDuckdb({
                      dbPath,
                      sharedLink: link,
                      viewName: tempViewName,
                    });

                    // Step 2: Validate temp view exists BEFORE proceeding
                    const tempExists = await validateTableExists(
                      dbPath,
                      tempViewName,
                    );
                    if (!tempExists) {
                      throw new Error(
                        'Failed to create temp view in database - view does not exist after creation',
                      );
                    }

                    // Step 3: Extract schema from temp view to generate semantic name
                    // Allow temp tables during creation process
                    const schema = await extractSchema({
                      dbPath,
                      viewName: tempViewName,
                      allowTempTables: true,
                    });

                    // Step 4: Generate semantic name
                    const existingNames = existing.map((r) => r.viewName);
                    const semanticName = generateSemanticViewName(
                      schema,
                      existingNames,
                    );
                    const displayName = semanticName;

                    // Step 5: Create final view from temp table (atomic operation)
                    finalViewName = semanticName;
                    await createViewFromTable(
                      dbPath,
                      finalViewName,
                      tempViewName,
                    );

                    // Step 6: Validate final view exists
                    const finalExists = await validateTableExists(
                      dbPath,
                      finalViewName,
                    );
                    if (!finalExists) {
                      throw new Error(
                        'Failed to create final view - view does not exist after creation',
                      );
                    }

                    // Step 7: Drop temp table (cleanup)
                    await dropTable(dbPath, tempViewName);

                    // Step 8: Register view AFTER successful creation
                    const { record } = await registerSheetView(
                      context,
                      link,
                      finalViewName,
                      displayName,
                      schema,
                    );

                    // Step 9: Build business context from FINAL view only
                    const finalSchema = await extractSchema({
                      dbPath,
                      viewName: finalViewName,
                    });
                    // Build fast context (synchronous, < 100ms)
                    await buildBusinessContext({
                      conversationDir: fileDir,
                      viewName: finalViewName,
                      schema: finalSchema,
                    });
                    // Start enhancement in background (don't await)
                    enhanceBusinessContextInBackground({
                      conversationDir: fileDir,
                      viewName: finalViewName,
                      schema: finalSchema,
                      dbPath,
                    });

                    return {
                      viewName: finalViewName,
                      displayName,
                      sharedLink: record.sharedLink,
                    };
                  } catch (error) {
                    // Cleanup on failure
                    try {
                      if (tempViewName) await dropTable(dbPath, tempViewName);
                      if (finalViewName) await dropTable(dbPath, finalViewName);
                    } catch (cleanupError) {
                      console.warn(
                        '[ReadDataAgent] Cleanup failed:',
                        cleanupError,
                      );
                    }
                    throw error;
                  }
                },
                {
                  maxRetries: 3,
                  retryDelay: 200,
                  shouldRetry: (error) => {
                    const errorMsg = error.message;
                    // Retry on "does not exist" errors (might be timing issue)
                    return (
                      errorMsg.includes('does not exist') ||
                      errorMsg.includes('Catalog Error') ||
                      errorMsg.includes('Catalog')
                    );
                  },
                },
              );

              results.push({
                success: true,
                viewName: result.viewName,
                displayName: result.displayName,
                link,
              });
            } catch (error) {
              const errorMessage = formatViewCreationError(
                error as Error,
                link,
              );
              results.push({
                success: false,
                error: errorMessage,
                link,
              });
            }
          }

          // Invalidate cache
          cachedViews = null;

          const successful = results.filter((r) => r.success);
          const failed = results.filter((r) => !r.success);

          if (failed.length > 0) {
            // Return partial success with error details
            return {
              content:
                `Successfully created ${successful.length} view(s). ` +
                `Failed to create ${failed.length} view(s): ${failed
                  .map((f) => f.error)
                  .join('; ')}`,
              views: successful.map((r) => ({
                viewName: r.viewName!,
                displayName: r.displayName!,
                sharedLink: r.link,
              })),
              errors: failed.map((f) => ({
                sharedLink: f.link,
                error: f.error,
              })),
            };
          }

          return {
            content: `Successfully created ${successful.length} view(s) from Google Sheets.`,
            views: successful.map((r) => ({
              viewName: r.viewName!,
              displayName: r.displayName!,
              sharedLink: r.link,
            })),
          };
        },
      }),
      listViews: tool({
        description:
          'List all available views (sheets) in the database. Use this to see what data sources are available when the user asks about multiple sheets or when you need to know which view to query.',
        inputSchema: z.object({}),
        execute: async () => {
          const workspace = getWorkspace();
          if (!workspace) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const fileDir = join(workspace, conversationId);
          const context: RegistryContext = {
            conversationDir: fileDir,
          };
          const registry = await loadViewRegistry(context);
          return {
            views: registry.map((record) => ({
              viewName: record.viewName,
              sharedLink: record.sharedLink,
              sourceId: record.sourceId,
              createdAt: record.createdAt,
              lastUsedAt: record.lastUsedAt,
            })),
          };
        },
      }),
      getSchema: tool({
        description:
          'Get the schema of one or all Google Sheet views. If viewName is provided, returns schema for that specific view. If not provided, returns schemas for all available views. Use this to understand the data structure before writing queries. This also updates the business context automatically.',
        inputSchema: z.object({
          viewName: z.string().optional(),
        }),
        execute: async ({ viewName }) => {
          const workspace = getWorkspace();
          if (!workspace) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const dbPath = join(workspace, conversationId, 'database.db');
          const fileDir = join(workspace, conversationId);
          const context: RegistryContext = {
            conversationDir: fileDir,
          };

          // Use cached views if available
          const views = cachedViews || (await loadViewRegistry(context));

          // Validate viewName exists if provided
          if (viewName) {
            const viewNameToCheck = viewName;
            const view = views.find(
              (v) =>
                v.viewName === viewNameToCheck ||
                v.displayName === viewNameToCheck,
            );

            if (!view) {
              // Try to find similar names
              const viewNameLower = viewNameToCheck.toLowerCase();
              const suggestions = views
                .filter(
                  (v) =>
                    v.viewName.toLowerCase().includes(viewNameLower) ||
                    v.displayName?.toLowerCase().includes(viewNameLower),
                )
                .map((v) => v.displayName || v.viewName)
                .slice(0, 3);

              throw new Error(
                `View "${viewName}" not found. ${
                  suggestions.length > 0
                    ? `Did you mean: ${suggestions.join(', ')}?`
                    : `Available views: ${views.map((v) => v.displayName || v.viewName).join(', ')}`
                }`,
              );
            }

            // Validate view exists in database
            const exists = await validateViewExists(dbPath, view.viewName);
            if (!exists) {
              throw new Error(
                `View "${viewName}" exists in registry but not in database. Please recreate the view.`,
              );
            }

            // Use the actual viewName from registry
            viewName = view.viewName;
          }

          // Get performance configuration
          const perfConfig = await getConfig(fileDir);

          let schema: SimpleSchema;
          let schemasMap: Map<string, SimpleSchema>;

          if (viewName) {
            // Single view - extract schema
            schema = await extractSchema({ dbPath, viewName });
            schemasMap = new Map([[viewName, schema]]);
          } else {
            // All views - extract schemas in parallel
            const allViewNames = views.map((v) => v.viewName);
            schemasMap = await extractSchemasParallel(
              dbPath,
              allViewNames,
              perfConfig.enableBatchProcessing ? 4 : 1,
            );
            // Use first schema for backward compatibility
            schema = schemasMap.values().next().value || {
              databaseName: 'google_sheet',
              schemaName: 'google_sheet',
              tables: [],
            };
          }

          // Build fast context (synchronous, < 100ms)
          let fastContext: BusinessContext;
          if (viewName) {
            // Single view - build fast context
            fastContext = await buildBusinessContext({
              conversationDir: fileDir,
              viewName,
              schema,
            });

            // Start enhancement in background (don't await)
            enhanceBusinessContextInBackground({
              conversationDir: fileDir,
              viewName,
              schema,
              dbPath,
            });
          } else {
            // Multiple views - build fast context for each
            const fastContexts: BusinessContext[] = [];
            for (const [vName, vSchema] of schemasMap.entries()) {
              const ctx = await buildBusinessContext({
                conversationDir: fileDir,
                viewName: vName,
                schema: vSchema,
              });
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
            fastContext = mergeBusinessContexts(fastContexts);
          }

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

          // Return schema and data insights (hide technical jargon)
          return {
            schema: schema,
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
          'Run a SQL query against the Google Sheet views. You can query a single view by name, or join multiple views together. Use listViews first to see available view names. When querying, reference views by their exact viewName from the registry.',
        inputSchema: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          const workspace = getWorkspace();
          if (!workspace) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const dbPath = join(workspace, conversationId, 'database.db');

          const result = await runQuery({
            dbPath,
            query,
          });

          // Try to extract view names from the query to update usage
          const fileDirPath = join(workspace, conversationId);
          const context: RegistryContext = {
            conversationDir: fileDirPath,
          };
          const registry = await loadViewRegistry(context);
          const viewNamesInQuery = registry
            .map((r) => r.viewName)
            .filter((vn) => query.includes(vn));
          for (const viewName of viewNamesInQuery) {
            await updateViewUsage(context, viewName);
          }

          return {
            result: result,
          };
        },
      }),
    },
    stopWhen: stepCountIs(20),
  });

  return result.stream({
    messages: convertToModelMessages(await validateUIMessages({ messages })),
  });
};

export const readDataAgentActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      conversationId: string;
      previousMessages: UIMessage[];
    };
  }) => {
    return readDataAgent(input.conversationId, input.previousMessages);
  },
);
