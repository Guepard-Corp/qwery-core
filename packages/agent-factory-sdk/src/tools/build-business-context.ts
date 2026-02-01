import type { SimpleSchema, SimpleTable } from '@qwery/domain/entities';
import type {
  BusinessContext,
  BusinessEntity,
  VocabularyEntry,
} from './types/business-context.types';
import { saveBusinessContext } from './utils/business-context.storage';
import { isSystemOrTempTable } from './utils/business-context.utils';
import { getLogger } from '@qwery/shared/logger';

export interface BuildBusinessContextOptions {
  conversationDir: string;
  viewName: string;
  schema: SimpleSchema;
}

/**
 * Simple entity name inference from ID columns (fast, no complex logic)
 */
function inferEntityNameFromId(columnName: string): string {
  let name = columnName.toLowerCase();
  // Remove _id or id suffix
  name = name.replace(/_id$|^id$/, '');
  // Convert to Title Case
  const words = name.split(/[_\s-]/).filter((w) => w.length > 0);
  if (words.length === 0) return columnName;
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Pattern-based entity detection (domain-agnostic)
 * Detects entities from column name patterns, not hardcoded keywords
 */
function isLikelyEntityColumn(columnName: string): boolean {
  const name = columnName.trim();

  // Pattern 1: Capitalized single word (e.g., "Athlete", "Recipe", "Book", "Expense")
  // These are typically entity names in data
  if (/^[A-Z][a-z]+$/.test(name) && name.length > 2) {
    return true;
  }

  // Pattern 2: Plural form (e.g., "Athletes", "Recipes", "Books")
  const lower = name.toLowerCase();
  if (lower.endsWith('s') && lower.length > 3 && !lower.endsWith('ss')) {
    // Check if it's a plural (simple heuristic)
    const singular = lower.slice(0, -1);
    if (singular.length > 2) {
      return true;
    }
  }

  // Pattern 3: ID columns (existing pattern)
  if (lower.endsWith('_id') || lower === 'id') {
    return true;
  }

  return false;
}

/**
 * Extract entity name from column using patterns (domain-agnostic)
 */
function extractEntityName(columnName: string): string | null {
  const name = columnName.trim();
  const lower = name.toLowerCase();

  // Pattern 1: ID columns (e.g., "user_id", "recipe_id")
  if (lower.endsWith('_id') || lower === 'id') {
    return inferEntityNameFromId(columnName);
  }

  // Pattern 2: Capitalized single word (e.g., "Athlete" → "Athlete")
  if (/^[A-Z][a-z]+$/.test(name)) {
    return name; // Use as-is (already capitalized)
  }

  // Pattern 3: Plural form (e.g., "Athletes" → "Athlete")
  if (lower.endsWith('s') && lower.length > 3 && !lower.endsWith('ss')) {
    const singular = lower.slice(0, -1);
    // Convert to singular and capitalize
    if (singular.length > 2) {
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    }
  }

  // Pattern 4: Snake_case or camelCase (e.g., "user_name" → "User")
  if (name.includes('_') || /[a-z][A-Z]/.test(name)) {
    const words = name.split(/[_\s-]/).filter((w) => w.length > 0);
    if (words.length > 0) {
      // Take first word, capitalize
      const firstWord = words[0];
      if (firstWord) {
        return (
          firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase()
        );
      }
    }
  }

  return null;
}

/**
 * Build fast business context from schema (primary entities only, < 100ms)
 * TRULY MINIMAL: No file I/O, no merging, no expensive operations
 * Only extracts ID columns and builds minimal vocabulary
 */
export const buildBusinessContext = async (
  opts: BuildBusinessContextOptions,
): Promise<BusinessContext> => {
  const startTime = Date.now();

  // Filter out system/temp tables (synchronous, fast)
  const filteredSchema = {
    ...opts.schema,
    tables: opts.schema.tables.filter(
      (t: SimpleTable) => !isSystemOrTempTable(t.tableName),
    ),
  };

  if (filteredSchema.tables.length === 0) {
    throw new Error(
      `No valid tables found in schema for view: ${opts.viewName}`,
    );
  }

  // FAST PATH: Extract entities using PATTERN-BASED detection (domain-agnostic)
  // NO file I/O, NO merging, NO expensive operations
  const entities = new Map<string, BusinessEntity>();
  const vocabulary = new Map<string, VocabularyEntry>();

  for (const table of filteredSchema.tables) {
    for (const column of table.columns) {
      const colName = column.columnName.toLowerCase();

      // Use pattern-based detection (domain-agnostic)
      if (isLikelyEntityColumn(column.columnName)) {
        const entityName = extractEntityName(column.columnName);

        if (entityName) {
          const entityKey = entityName.toLowerCase();

          // Create or update entity
          const existing = entities.get(entityKey);
          if (existing) {
            if (!existing.columns.includes(column.columnName)) {
              existing.columns.push(column.columnName);
            }
          } else {
            // Determine business type from pattern
            let businessType: BusinessEntity['businessType'] = 'entity';
            if (colName.endsWith('_id') || colName === 'id') {
              businessType = 'relationship';
            }

            entities.set(entityKey, {
              name: entityName,
              columns: [column.columnName],
              views: [opts.viewName],
              dataType: column.columnType,
              businessType,
              confidence:
                colName.endsWith('_id') || colName === 'id' ? 0.8 : 0.7,
            });
          }

          // Build vocabulary (pattern-based, no hardcoded synonyms)
          vocabulary.set(colName, {
            businessTerm: entityName,
            technicalTerms: [column.columnName],
            confidence: colName.endsWith('_id') || colName === 'id' ? 1.0 : 0.9,
            synonyms: [], // Enhanced path will add synonyms
          });
        }
      }
    }
  }

  // Create minimal context (NO file I/O, NO loading existing context)
  const fastContext: BusinessContext = {
    entities,
    vocabulary,
    relationships: [], // Empty - no relationship detection in fast path
    entityGraph: new Map(), // Empty - no graph building in fast path
    domain: {
      domain: 'general',
      confidence: 0.5,
      keywords: [],
      alternativeDomains: [],
    }, // Default - no domain inference in fast path
    views: new Map([
      [
        opts.viewName,
        {
          viewName: opts.viewName,
          schema: filteredSchema,
          entities: Array.from(entities.values()).map((e) => e.name),
          lastAnalyzed: new Date().toISOString(),
        },
      ],
    ]),
    updatedAt: new Date().toISOString(),
  };

  // Save in background (don't await - this is the only I/O and it's async)
  saveBusinessContext(opts.conversationDir, fastContext).catch(async (err) => {
    const logger = await getLogger();
    logger.warn(`[BuildBusinessContext] Failed to save fast context:`, err);
  });

  const elapsed = Date.now() - startTime;
  if (elapsed > 100) {
    getLogger().then((l) =>
      l.warn(
        `[BuildBusinessContext] Fast path took ${elapsed}ms (target: < 100ms) for view: ${opts.viewName}`,
      ),
    );
  }

  return fastContext;
};
