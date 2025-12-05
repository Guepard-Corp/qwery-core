import type { SimpleSchema } from '@qwery/domain/entities';
import type {
  BusinessEntity,
  Relationship,
  VocabularyEntry,
} from '../types/business-context.types';
import type { PerformanceConfig } from './business-context.config';

// Removed BUSINESS_SYNONYMS - now using pattern-based synonym detection (domain-agnostic)

// Plural to singular mappings
const PLURAL_TO_SINGULAR: Record<string, string> = {
  customers: 'customer',
  users: 'user',
  orders: 'order',
  products: 'product',
  employees: 'employee',
  departments: 'department',
  items: 'item',
  transactions: 'transaction',
  sales: 'sale',
};

/**
 * Convert plural to singular
 */
export function toSingular(word: string): string {
  const lower = word.toLowerCase();
  const singular = PLURAL_TO_SINGULAR[lower];
  if (singular) {
    return singular;
  }
  // Simple rules
  if (lower.endsWith('ies')) {
    return lower.slice(0, -3) + 'y';
  }
  if (lower.endsWith('es') && lower.length > 3) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith('s') && lower.length > 1) {
    return lower.slice(0, -1);
  }
  return word;
}

/**
 * Infer business entity name from column name (enhanced)
 */
export function inferBusinessEntity(columnName: string): string {
  let name = columnName.toLowerCase();

  // Remove ID suffixes
  name = name.replace(/_id$|id$/, '');

  // Remove common prefixes
  name = name.replace(/^user_|^customer_|^order_|^product_|^dept_|^item_/, '');

  // Handle compound entities: "order_item" → "Order Item"
  const words = name.split('_').filter((w) => w.length > 0);
  if (words.length === 0) return columnName;

  // Convert to Title Case
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Detect business type from column name and data type (enhanced)
 */
export function detectBusinessType(
  columnName: string,
  dataType: string,
): BusinessEntity['businessType'] {
  const name = columnName.toLowerCase();

  // Relationship indicators
  if (name.endsWith('_id') || name === 'id') {
    return 'relationship';
  }

  // Entity indicators (primary keys or main identifiers)
  if (
    name === 'id' ||
    name.includes('user') ||
    name.includes('customer') ||
    name.includes('order') ||
    (name.endsWith('_key') && dataType.includes('INTEGER'))
  ) {
    return 'entity';
  }

  // Attributes (everything else)
  return 'attribute';
}

/**
 * Calculate entity confidence based on naming patterns and data types
 */
export function calculateEntityConfidence(
  columnName: string,
  dataType: string,
  businessType: BusinessEntity['businessType'],
): number {
  let confidence = 0.5; // base confidence

  const name = columnName.toLowerCase();

  // High confidence indicators
  if (name === 'id' && dataType.includes('INTEGER')) {
    confidence = 0.95;
  } else if (name.endsWith('_id') && dataType.includes('INTEGER')) {
    confidence = 0.9;
  } else if (
    businessType === 'entity' &&
    name.match(/^(user|customer|order|product)/)
  ) {
    confidence = 0.85;
  } else if (businessType === 'relationship') {
    confidence = 0.8;
  } else if (
    dataType.includes('VARCHAR') &&
    name.match(/(name|title|description)/)
  ) {
    confidence = 0.75;
  } else if (dataType.includes('DATE') || dataType.includes('TIMESTAMP')) {
    confidence = 0.7;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Check if table name is a system or temp table
 */
export function isSystemOrTempTable(tableName: string): boolean {
  const name = tableName.toLowerCase();
  return (
    name.startsWith('temp_') ||
    name.startsWith('pragma_') ||
    name === 'information_schema' ||
    name.includes('_temp') ||
    name.includes('_tmp') ||
    name.startsWith('pg_') ||
    name.startsWith('sqlite_') ||
    name.startsWith('duckdb_') ||
    name.startsWith('main.') ||
    name.startsWith('temp.')
  );
}

/**
 * Normalize term for deduplication
 */
export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Group related columns into entities (e.g., user_id, user_name, user_email → User entity)
 */
function groupRelatedColumns(
  columns: Array<{ columnName: string; columnType: string }>,
  tableName: string,
): BusinessEntity[] {
  const entityMap = new Map<string, BusinessEntity>();

  for (const column of columns) {
    const entityName = inferBusinessEntity(column.columnName);
    const businessType = detectBusinessType(
      column.columnName,
      column.columnType,
    );
    const confidence = calculateEntityConfidence(
      column.columnName,
      column.columnType,
      businessType,
    );

    const existing = entityMap.get(entityName);
    if (existing) {
      // Merge columns into existing entity
      if (!existing.columns.includes(column.columnName)) {
        existing.columns.push(column.columnName);
      }
      // Update confidence if higher
      existing.confidence = Math.max(existing.confidence, confidence);
    } else {
      entityMap.set(entityName, {
        name: entityName,
        columns: [column.columnName],
        views: [tableName],
        dataType: column.columnType,
        businessType,
        confidence,
      });
    }
  }

  return Array.from(entityMap.values());
}

/**
 * Analyze a single schema to extract business entities (enhanced with pruning)
 * Filters out system and temp tables
 */
export function analyzeSchema(
  schema: SimpleSchema,
  options: {
    skipExisting?: boolean;
    existingEntities?: Map<string, BusinessEntity>;
    confidenceThreshold?: number;
    maxEntities?: number;
  } = {},
): BusinessEntity[] {
  const {
    skipExisting = false,
    existingEntities = new Map(),
    confidenceThreshold = 0.6,
    maxEntities = Infinity,
  } = options;

  const entityMap = new Map<string, BusinessEntity>(); // Group by entity name

  for (const table of schema.tables) {
    // SKIP system and temp tables
    if (isSystemOrTempTable(table.tableName)) {
      continue;
    }

    for (const column of table.columns) {
      // EARLY TERMINATION: Skip if already processed
      if (skipExisting) {
        const entityKey = inferBusinessEntity(column.columnName).toLowerCase();
        if (existingEntities.has(entityKey)) {
          continue;
        }
      }

      const entities = groupRelatedColumns(
        [{ columnName: column.columnName, columnType: column.columnType }],
        table.tableName,
      );

      for (const entity of entities) {
        // PRUNING: Skip if confidence too low
        if (entity.confidence < confidenceThreshold) {
          continue;
        }

        // Group columns by entity name
        const existing = entityMap.get(entity.name);
        if (existing) {
          if (!existing.columns.includes(column.columnName)) {
            existing.columns.push(column.columnName);
          }
          if (!existing.views.includes(table.tableName)) {
            existing.views.push(table.tableName);
          }
          // Update confidence if higher
          existing.confidence = Math.max(
            existing.confidence,
            entity.confidence,
          );
        } else {
          entityMap.set(entity.name, entity);
        }
      }
    }
  }

  // Limit total entities (prevent explosion)
  const result = Array.from(entityMap.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxEntities);

  return result;
}

/**
 * Detect synonyms from column name patterns (domain-agnostic)
 */
function detectSynonymsFromPatterns(
  entityName: string,
  allColumns: string[],
): string[] {
  const synonyms: string[] = [];
  const entityLower = entityName.toLowerCase();

  // Pattern 1: Plural/singular variations
  if (entityLower.endsWith('s')) {
    synonyms.push(entityLower.slice(0, -1)); // singular
  } else {
    synonyms.push(entityLower + 's'); // plural
  }

  // Pattern 2: Column name variations (e.g., "user_name" → "user")
  for (const col of allColumns) {
    const lower = col.toLowerCase();
    if (lower.includes(entityLower) && lower !== entityLower) {
      // Extract variations (e.g., "user_id", "user_name" → "user")
      const parts = lower.split(/[_\s-]/);
      for (const part of parts) {
        if (part === entityLower && !synonyms.includes(part)) {
          synonyms.push(part);
        }
      }
    }
  }

  return [...new Set(synonyms)].filter((s) => s !== entityLower);
}

/**
 * Build enhanced vocabulary with synonyms, plurals, and confidence (pattern-based)
 */
export function buildVocabulary(
  entities: BusinessEntity[],
  config?: PerformanceConfig,
): Map<string, VocabularyEntry> {
  const minConfidence = config?.minVocabularyConfidence ?? 0.7;
  const vocabulary = new Map<string, VocabularyEntry>();
  const normalizedMap = new Map<string, string>(); // normalized -> original

  // Collect all column names for pattern-based synonym detection
  const allColumnNames = entities.flatMap((e) => e.columns);

  for (const entity of entities) {
    // Skip low-confidence entities
    if (entity.confidence < minConfidence) continue;

    const entityNameLower = entity.name.toLowerCase();

    // Detect synonyms from patterns (domain-agnostic)
    const detectedSynonyms = detectSynonymsFromPatterns(
      entity.name,
      allColumnNames,
    );

    // Create or update vocabulary entry
    let entry = vocabulary.get(entityNameLower);
    if (!entry) {
      entry = {
        businessTerm: entity.name,
        technicalTerms: [],
        confidence: entity.confidence,
        synonyms: detectedSynonyms,
      };
      vocabulary.set(entityNameLower, entry);
    }

    // Add all columns for this entity
    for (const column of entity.columns) {
      if (!entry.technicalTerms.includes(column)) {
        entry.technicalTerms.push(column);
      }
    }

    // Map technical column names to business terms
    for (const column of entity.columns) {
      const colLower = column.toLowerCase();
      const normalized = normalizeTerm(column);

      // DEDUPLICATION: Use existing entry if normalized term exists
      if (normalizedMap.has(normalized)) {
        const existingKey = normalizedMap.get(normalized)!;
        const existing = vocabulary.get(existingKey)!;

        // Merge technical terms
        if (!existing.technicalTerms.includes(column)) {
          existing.technicalTerms.push(column);
        }
        continue;
      }

      // Exact match - highest confidence
      normalizedMap.set(normalized, colLower);
      if (!vocabulary.has(colLower)) {
        vocabulary.set(colLower, {
          businessTerm: entity.name,
          technicalTerms: [column],
          confidence: 1.0,
          synonyms: detectedSynonyms,
        });
      }

      // Variations with lower confidence (pattern-based)
      const variations = [
        column.replace(/_id$/, ''),
        toSingular(column),
        // Extract first word from snake_case/camelCase
        column.split(/[_\s-]/)[0] || column,
      ].filter((v) => v && v !== column && v.length > 0);

      for (const variation of variations) {
        if (variation && variation !== column && variation.length > 0) {
          const varLower = variation.toLowerCase();
          const varNormalized = normalizeTerm(variation);
          if (!normalizedMap.has(varNormalized) && !vocabulary.has(varLower)) {
            normalizedMap.set(varNormalized, varLower);
            vocabulary.set(varLower, {
              businessTerm: entity.name,
              technicalTerms: [column],
              confidence: 0.8,
              synonyms: detectedSynonyms,
            });
          }
        }
      }
    }
  }

  return vocabulary;
}

/**
 * Build entity relationship graph
 */
export function buildEntityGraph(
  entities: BusinessEntity[],
  relationships: Relationship[],
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  // Initialize graph with all entities
  for (const entity of entities) {
    if (!graph.has(entity.name)) {
      graph.set(entity.name, []);
    }
  }

  // Add relationships to graph
  for (const rel of relationships) {
    // Find entities for the views involved in the relationship
    const fromEntities = entities.filter((e) => e.views.includes(rel.fromView));
    const toEntities = entities.filter((e) => e.views.includes(rel.toView));

    for (const fromEntity of fromEntities) {
      for (const toEntity of toEntities) {
        if (fromEntity.name !== toEntity.name) {
          const connections = graph.get(fromEntity.name) || [];
          if (!connections.includes(toEntity.name)) {
            connections.push(toEntity.name);
            graph.set(fromEntity.name, connections);
          }
        }
      }
    }
  }

  return graph;
}

/**
 * Infer domain from schema patterns (PATTERN-BASED, domain-agnostic)
 * Analyzes column name patterns, structures, and relationships to infer domain
 */
export function inferDomain(schemas: SimpleSchema[]): {
  domain: string;
  confidence: number;
  keywords: string[];
  alternativeDomains: Array<{ domain: string; confidence: number }>;
} {
  // Collect all column names and patterns
  const allColumns: string[] = [];
  const columnPatterns = new Map<string, number>(); // pattern -> count

  for (const schema of schemas) {
    for (const table of schema.tables) {
      for (const col of table.columns) {
        const name = col.columnName.toLowerCase();
        allColumns.push(name);

        // Extract patterns (words, stems)
        const words = name.split(/[_\s-]/).filter((w) => w.length > 2);
        for (const word of words) {
          const count = columnPatterns.get(word) || 0;
          columnPatterns.set(word, count + 1);
        }
      }
    }
  }

  // Pattern-based domain inference (no hardcoded domains)
  // Analyze column patterns to infer domain characteristics

  // Pattern 1: Temporal data (dates, times, years)
  const hasTemporal = allColumns.some(
    (c) =>
      c.includes('date') ||
      c.includes('time') ||
      c.includes('year') ||
      c.includes('month') ||
      c.includes('day') ||
      c === 'timestamp',
  );

  // Pattern 2: Financial data (amounts, prices, costs, currency)
  const hasFinancial = allColumns.some(
    (c) =>
      c.includes('price') ||
      c.includes('cost') ||
      c.includes('amount') ||
      c.includes('revenue') ||
      c.includes('expense') ||
      c.includes('budget') ||
      c.includes('currency') ||
      c.includes('payment') ||
      c.includes('total'),
  );

  // Pattern 3: Location data (address, city, country, location)
  const hasLocation = allColumns.some(
    (c) =>
      c.includes('address') ||
      c.includes('city') ||
      c.includes('country') ||
      c.includes('location') ||
      c.includes('region') ||
      c.includes('state') ||
      c.includes('zip') ||
      c.includes('postal'),
  );

  // Pattern 4: Measurement data (weight, height, quantity, count)
  const hasMeasurement = allColumns.some(
    (c) =>
      c.includes('weight') ||
      c.includes('height') ||
      c.includes('quantity') ||
      c.includes('count') ||
      c.includes('size') ||
      c.includes('length') ||
      c.includes('width') ||
      c.includes('volume'),
  );

  // Pattern 5: Rating/score data (rating, score, grade, stars)
  const hasRating = allColumns.some(
    (c) =>
      c.includes('rating') ||
      c.includes('score') ||
      c.includes('grade') ||
      c.includes('star') ||
      c.includes('review') ||
      c.includes('feedback'),
  );

  // Build domain inference from patterns
  const keywords: string[] = [];
  const alternativeDomains: Array<{ domain: string; confidence: number }> = [];
  let domain = 'general';
  let confidence = 0.5;

  // Combine patterns to infer domain
  if (hasFinancial && hasTemporal) {
    domain = 'finance';
    confidence = 0.8;
    keywords.push('financial', 'temporal', 'transaction');
  } else if (hasLocation && hasRating) {
    domain = 'location_based';
    confidence = 0.75;
    keywords.push('location', 'rating', 'review');
  } else if (hasMeasurement && hasTemporal) {
    domain = 'tracking';
    confidence = 0.75;
    keywords.push('measurement', 'temporal', 'progress');
  } else if (hasFinancial) {
    domain = 'financial';
    confidence = 0.7;
    keywords.push('financial', 'monetary');
  } else if (hasLocation) {
    domain = 'geographic';
    confidence = 0.7;
    keywords.push('location', 'geographic');
  } else if (hasRating) {
    domain = 'review';
    confidence = 0.7;
    keywords.push('rating', 'review');
  } else if (hasTemporal) {
    domain = 'temporal';
    confidence = 0.65;
    keywords.push('temporal', 'time_series');
  }

  // Add top column patterns as keywords
  const topPatterns = Array.from(columnPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern]) => pattern);
  keywords.push(...topPatterns);

  return {
    domain,
    confidence,
    keywords: [...new Set(keywords)], // Remove duplicates
    alternativeDomains,
  };
}
