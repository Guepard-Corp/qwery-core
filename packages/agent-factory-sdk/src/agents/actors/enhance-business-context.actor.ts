import { fromPromise } from 'xstate/actors';
import type { SimpleSchema } from '@qwery/domain/entities';
import type { BusinessContext } from '../../tools/types/business-context.types';
import {
  loadBusinessContext,
  saveBusinessContext,
  createEmptyContext,
} from '../../tools/utils/business-context.storage';
import {
  analyzeSchema,
  buildVocabulary,
  inferDomain,
  buildEntityGraph,
  isSystemOrTempTable,
} from '../../tools/utils/business-context.utils';
import { findRelationshipsParallel } from '../../tools/utils/business-context.relationships';
import { extractDataPatterns } from '../../tools/utils/business-context.patterns';
import { getConfig } from '../../tools/utils/business-context.config';

export interface EnhanceBusinessContextInput {
  conversationDir: string;
  viewName: string;
  schema: SimpleSchema;
  dbPath?: string;
  parentActorId?: string; // Optional parent actor ID for communication
}

// Track in-flight enhancements to prevent duplicates
const inFlightEnhancements = new Set<string>();

/**
 * Enhanced business context function
 * Builds full context asynchronously in background (5-10s)
 * This includes all entities, relationships, vocabulary, and domain inference
 */
async function enhanceBusinessContextFunction(
  input: EnhanceBusinessContextInput,
): Promise<BusinessContext> {
  const startTime = Date.now();

  // Load existing context (may be fast context from buildBusinessContext)
  let context = await loadBusinessContext(input.conversationDir);
  if (!context) {
    // If no context exists, create empty one
    context = createEmptyContext();
  }

  // Get performance configuration
  const config = await getConfig(input.conversationDir);

  // Filter out system/temp tables
  const filteredSchema = {
    ...input.schema,
    tables: input.schema.tables.filter(
      (t) => !isSystemOrTempTable(t.tableName),
    ),
  };

  if (filteredSchema.tables.length === 0) {
    throw new Error(
      `No valid tables found in schema for view: ${input.viewName}`,
    );
  }

  // ENHANCED PATH: Extract all entities with confidence scoring
  const newEntities = analyzeSchema(filteredSchema, {
    skipExisting: config.enablePruning,
    existingEntities: context.entities,
    confidenceThreshold: config.minEntityConfidence,
    maxEntities: config.expectedColumnCount * 2,
  });

  // Merge entities
  for (const entity of newEntities) {
    const entityKey = entity.name.toLowerCase();
    const existing = context.entities.get(entityKey);

    if (existing) {
      for (const col of entity.columns) {
        if (!existing.columns.includes(col)) {
          existing.columns.push(col);
        }
      }
      if (!existing.views.includes(input.viewName)) {
        existing.views.push(input.viewName);
      }
      existing.confidence = Math.max(existing.confidence, entity.confidence);
    } else {
      context.entities.set(entityKey, entity);
    }
  }

  // Extract data patterns if enabled and dbPath is available (expensive operation, optional)
  let dataPatterns;
  if (input.dbPath && config.enableDataPatterns && config.enablePruning) {
    try {
      dataPatterns = await extractDataPatterns(
        input.dbPath,
        input.viewName,
        input.schema,
      );
    } catch {
      // If extraction fails, continue without patterns
    }
  }

  // Update view metadata
  context.views.set(input.viewName, {
    viewName: input.viewName,
    schema: filteredSchema,
    entities: newEntities.map((e) => e.name),
    lastAnalyzed: new Date().toISOString(),
    dataPatterns,
  });

  // ENHANCED PATH: Build full vocabulary with synonyms
  const allEntities = Array.from(context.entities.values());
  context.vocabulary = buildVocabulary(allEntities, config);

  // ENHANCED PATH: Find relationships (if multiple views exist)
  if (context.views.size >= 2) {
    const schemasMap = new Map<string, SimpleSchema>();
    for (const [viewName, metadata] of context.views.entries()) {
      if (viewName !== input.viewName && !isSystemOrTempTable(viewName)) {
        schemasMap.set(viewName, metadata.schema);
      }
    }
    schemasMap.set(input.viewName, filteredSchema);

    if (schemasMap.size >= 2) {
      context.relationships = await findRelationshipsParallel(
        context,
        schemasMap,
        input.dbPath || null,
        config,
      );
    }
  }

  // ENHANCED PATH: Build entity graph
  context.entityGraph = buildEntityGraph(allEntities, context.relationships);

  // ENHANCED PATH: Infer domain
  const allSchemasForDomain = Array.from(context.views.entries())
    .filter(([viewName]) => !isSystemOrTempTable(viewName))
    .map(([, meta]) => meta.schema);
  context.domain = inferDomain(allSchemasForDomain);

  // Save enhanced context (overwrites fast context)
  await saveBusinessContext(input.conversationDir, context);

  const elapsed = Date.now() - startTime;
  console.log(
    `[EnhanceBusinessContext] Enhanced context built in ${elapsed}ms for view: ${input.viewName}`,
  );

  return context;
}

/**
 * Enhanced business context actor (for use in actor systems)
 */
export const enhanceBusinessContextActor = fromPromise(
  async ({
    input,
  }: {
    input: EnhanceBusinessContextInput;
  }): Promise<BusinessContext> => {
    return enhanceBusinessContextFunction(input);
  },
);

/**
 * Start enhancement in background (fire and forget, truly non-blocking)
 * Prevents duplicate calls for the same view
 */
export function enhanceBusinessContextInBackground(
  input: EnhanceBusinessContextInput,
): void {
  const key = `${input.conversationDir}:${input.viewName}`;

  // Skip if already in progress
  if (inFlightEnhancements.has(key)) {
    console.debug(
      `[EnhanceBusinessContext] Skipping duplicate enhancement for: ${input.viewName}`,
    );
    return;
  }

  inFlightEnhancements.add(key);

  const runEnhancement = () => {
    enhanceBusinessContextFunction(input)
      .finally(() => {
        inFlightEnhancements.delete(key);
      })
      .catch((error) => {
        console.warn(
          '[EnhanceBusinessContext] Background enhancement failed:',
          error,
        );
      });
  };

  // Use setImmediate to ensure truly async execution (doesn't block event loop)
  if (typeof setImmediate !== 'undefined') {
    setImmediate(runEnhancement);
  } else {
    // Fallback for environments without setImmediate
    Promise.resolve().then(runEnhancement);
  }
}
