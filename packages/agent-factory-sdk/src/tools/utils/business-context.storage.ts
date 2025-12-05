import type {
  BusinessContext,
  BusinessEntity,
  VocabularyEntry,
  ViewMetadata,
} from '../types/business-context.types';

const BUSINESS_CONTEXT_FILE = 'business-context.json';

/**
 * Create empty business context
 */
export function createEmptyContext(): BusinessContext {
  return {
    entities: new Map(),
    vocabulary: new Map(),
    relationships: [],
    entityGraph: new Map(),
    domain: {
      domain: 'general',
      confidence: 0.5,
      keywords: [],
      alternativeDomains: [],
    },
    views: new Map(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Load business context from file
 */
export async function loadBusinessContext(
  conversationDir: string,
): Promise<BusinessContext | null> {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const contextPath = join(conversationDir, BUSINESS_CONTEXT_FILE);

  try {
    const content = await readFile(contextPath, 'utf-8');
    const data = JSON.parse(content);

    // Reconstruct Maps from JSON with proper types
    const entities = new Map<string, BusinessEntity>();
    if (data.entities) {
      for (const [key, value] of data.entities) {
        entities.set(key, value as BusinessEntity);
      }
    }

    const vocabulary = new Map<string, VocabularyEntry>();
    if (data.vocabulary) {
      // Handle both old format (Map<string, string>) and new format (Map<string, VocabularyEntry>)
      for (const [key, value] of data.vocabulary) {
        if (typeof value === 'string') {
          // Old format - convert to new format
          vocabulary.set(key, {
            businessTerm: value,
            technicalTerms: [key],
            confidence: 0.8,
            synonyms: [],
          });
        } else {
          vocabulary.set(key, value as VocabularyEntry);
        }
      }
    }

    const views = new Map<string, ViewMetadata>();
    if (data.views) {
      for (const [key, value] of data.views) {
        views.set(key, value as ViewMetadata);
      }
    }

    return {
      entities,
      vocabulary,
      relationships: data.relationships || [],
      entityGraph: new Map(data.entityGraph || []),
      domain: data.domain || {
        domain: 'general',
        confidence: 0.5,
        keywords: [],
        alternativeDomains: [],
      },
      views,
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Save business context to file
 */
export async function saveBusinessContext(
  conversationDir: string,
  context: BusinessContext,
): Promise<void> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  await mkdir(conversationDir, { recursive: true });

  const contextPath = join(conversationDir, BUSINESS_CONTEXT_FILE);

  // Convert Maps to arrays for JSON serialization
  const serializable = {
    entities: Array.from(context.entities.entries()),
    vocabulary: Array.from(context.vocabulary.entries()),
    relationships: context.relationships,
    entityGraph: Array.from(context.entityGraph.entries()),
    domain: context.domain,
    views: Array.from(context.views.entries()),
    updatedAt: new Date().toISOString(),
  };

  await writeFile(contextPath, JSON.stringify(serializable, null, 2), 'utf-8');
}

/**
 * Merge multiple business contexts into one
 * Used when processing multiple views to combine fast contexts
 */
export function mergeBusinessContexts(
  contexts: BusinessContext[],
): BusinessContext {
  if (contexts.length === 0) {
    return createEmptyContext();
  }

  if (contexts.length === 1) {
    const first = contexts[0];
    if (!first) {
      return createEmptyContext();
    }
    return first;
  }

  const merged: BusinessContext = {
    entities: new Map(),
    vocabulary: new Map(),
    relationships: [], // Empty - enhanced path will populate
    entityGraph: new Map(), // Empty - enhanced path will populate
    domain: {
      domain: 'general',
      confidence: 0.5,
      keywords: [],
      alternativeDomains: [],
    }, // Default - enhanced path will populate
    views: new Map(),
    updatedAt: new Date().toISOString(),
  };

  // Merge entities
  for (const context of contexts) {
    for (const [entityKey, entity] of context.entities.entries()) {
      const existing = merged.entities.get(entityKey);
      if (existing) {
        // Merge columns (deduplicate)
        for (const col of entity.columns) {
          if (!existing.columns.includes(col)) {
            existing.columns.push(col);
          }
        }
        // Merge views (deduplicate)
        for (const view of entity.views) {
          if (!existing.views.includes(view)) {
            existing.views.push(view);
          }
        }
        // Use max confidence
        existing.confidence = Math.max(existing.confidence, entity.confidence);
      } else {
        merged.entities.set(entityKey, { ...entity });
      }
    }
  }

  // Merge vocabulary
  for (const context of contexts) {
    for (const [term, entry] of context.vocabulary.entries()) {
      const existing = merged.vocabulary.get(term);
      if (existing) {
        // Merge technical terms (deduplicate)
        for (const techTerm of entry.technicalTerms) {
          if (!existing.technicalTerms.includes(techTerm)) {
            existing.technicalTerms.push(techTerm);
          }
        }
        // Use max confidence
        existing.confidence = Math.max(existing.confidence, entry.confidence);
      } else {
        merged.vocabulary.set(term, { ...entry });
      }
    }
  }

  // Merge views
  for (const context of contexts) {
    for (const [viewName, metadata] of context.views.entries()) {
      merged.views.set(viewName, metadata);
    }
  }

  return merged;
}
