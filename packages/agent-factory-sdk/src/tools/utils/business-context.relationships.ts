import type { SimpleSchema } from '@qwery/domain/entities';
import type {
  BusinessContext,
  Relationship,
} from '../types/business-context.types';
import type { PerformanceConfig } from './business-context.config';

/**
 * Validate relationship with actual data (check cardinality)
 */
async function validateRelationship(
  dbPath: string,
  fromView: string,
  toView: string,
  fromColumn: string,
  toColumn: string,
): Promise<{
  confidence: number;
  type: Relationship['type'];
  direction: Relationship['direction'];
}> {
  try {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      const escapedFromView = fromView.replace(/"/g, '""');
      const escapedToView = toView.replace(/"/g, '""');
      const escapedFromCol = fromColumn.replace(/"/g, '""');
      const escapedToCol = toColumn.replace(/"/g, '""');

      // Sample cardinality check
      const cardinalityQuery = `
        SELECT 
          COUNT(DISTINCT f."${escapedFromCol}") as from_unique,
          COUNT(DISTINCT t."${escapedToCol}") as to_unique,
          COUNT(*) as total
        FROM "${escapedFromView}" f
        JOIN "${escapedToView}" t ON f."${escapedFromCol}" = t."${escapedToCol}"
        LIMIT 1000
      `;

      const resultReader = await conn.runAndReadAll(cardinalityQuery);
      await resultReader.readAll();
      const results = resultReader.getRowObjectsJS() as Array<{
        from_unique: number;
        to_unique: number;
        total: number;
      }>;

      if (results.length === 0) {
        return { confidence: 0.5, type: 'unknown', direction: 'bidirectional' };
      }

      const result = results[0];
      if (!result) {
        return { confidence: 0.5, type: 'unknown', direction: 'bidirectional' };
      }

      const fromUnique = Number(result.from_unique) || 0;
      const toUnique = Number(result.to_unique) || 0;
      const total = Number(result.total) || 0;

      if (total === 0) {
        return { confidence: 0.3, type: 'unknown', direction: 'bidirectional' };
      }

      let type: Relationship['type'] = 'unknown';
      let direction: Relationship['direction'] = 'bidirectional';
      let confidence = 0.7;

      // Determine relationship type based on cardinality
      if (fromUnique === toUnique && fromUnique === total) {
        type = 'one-to-one';
        confidence = 0.9;
      } else if (fromUnique < toUnique) {
        type = 'one-to-many';
        direction = 'forward';
        confidence = 0.85;
      } else if (toUnique < fromUnique) {
        type = 'one-to-many';
        direction = 'reverse';
        confidence = 0.85;
      } else if (fromUnique < total && toUnique < total) {
        type = 'many-to-many';
        confidence = 0.8;
      }

      return { confidence, type, direction };
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  } catch {
    // If validation fails, return low confidence
    return { confidence: 0.5, type: 'unknown', direction: 'bidirectional' };
  }
}

/**
 * Find relationships between two views (incremental)
 */
async function findRelationshipsBetween(
  view1: { viewName: string; schema: SimpleSchema },
  view2: { viewName: string; schema: SimpleSchema },
  dbPath: string | null,
  config: PerformanceConfig,
): Promise<Relationship[]> {
  const relationships: Relationship[] = [];
  const columnMap = new Map<string, Array<{ view: string; column: string }>>();

  // Build column maps for both views
  for (const { viewName, schema } of [view1, view2]) {
    if (!schema || !schema.tables) continue;
    for (const table of schema.tables) {
      if (!table || !table.columns) continue;
      for (const column of table.columns) {
        if (!column) continue;
        const colName = column.columnName.toLowerCase();
        if (!columnMap.has(colName)) {
          columnMap.set(colName, []);
        }
        const colList = columnMap.get(colName);
        if (colList) {
          colList.push({ view: viewName, column: column.columnName });
        }
      }
    }
  }

  // Find common columns
  for (const [colName, occurrences] of columnMap.entries()) {
    if (occurrences.length >= 2) {
      const from = occurrences.find((o) => o.view === view1.viewName);
      const to = occurrences.find((o) => o.view === view2.viewName);

      if (from && to) {
        let type: Relationship['type'] = 'unknown';
        let direction: Relationship['direction'] = 'bidirectional';
        let confidence = 0.7;

        if (colName.endsWith('_id') || colName === 'id') {
          type = 'one-to-many';
          direction = 'forward';
          confidence = 0.8;
        }

        // Validate with actual data if dbPath is available
        if (dbPath && config.enablePruning) {
          const validation = await validateRelationship(
            dbPath,
            from.view,
            to.view,
            from.column,
            to.column,
          );
          type = validation.type;
          direction = validation.direction;
          confidence = validation.confidence;
        }

        if (confidence >= config.minRelationshipConfidence) {
          const joinCondition = `${from.view}."${from.column}" = ${to.view}."${to.column}"`;

          relationships.push({
            fromView: from.view,
            toView: to.view,
            fromColumn: from.column,
            toColumn: to.column,
            joinColumn: colName,
            type,
            direction,
            confidence,
            joinCondition,
          });
        }
      }
    }
  }

  return relationships;
}

/**
 * Find relationships in parallel for all view pairs
 */
export async function findRelationshipsParallel(
  context: BusinessContext,
  schemas: Map<string, SimpleSchema>,
  dbPath: string | null,
  config: PerformanceConfig,
): Promise<Relationship[]> {
  const schemaArray = Array.from(schemas.entries());
  const pairs: Array<[string, SimpleSchema, string, SimpleSchema]> = [];

  // Generate all pairs
  for (let i = 0; i < schemaArray.length; i++) {
    for (let j = i + 1; j < schemaArray.length; j++) {
      const entry1 = schemaArray[i];
      const entry2 = schemaArray[j];
      if (entry1 && entry2) {
        pairs.push([entry1[0], entry1[1], entry2[0], entry2[1]]);
      }
    }
  }

  // PARALLEL: Compare all pairs concurrently
  const relationshipPromises = pairs.map(
    async ([view1, schema1, view2, schema2]) => {
      return findRelationshipsBetween(
        { viewName: view1, schema: schema1 },
        { viewName: view2, schema: schema2 },
        dbPath,
        config,
      );
    },
  );

  const relationshipArrays = await Promise.all(relationshipPromises);

  // Flatten and filter
  const allRelationships = relationshipArrays.flat();
  return allRelationships
    .filter((r) => r.confidence >= config.minRelationshipConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, config.expectedViewCount * 3);
}
