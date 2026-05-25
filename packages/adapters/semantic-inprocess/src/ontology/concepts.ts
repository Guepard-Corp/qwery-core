import type { ConceptMatch } from '@qwery/domain';
import { isub } from './isub';
import type { OntologySchema } from './model';
import { splitIdentifier, tokenizeQuery } from './tokens';

export interface ConceptOptions {
  /** Minimum Jaccard overlap to keep a candidate (default 0.3). */
  jaccardMin: number;
  /** Maximum matches returned (default 10). */
  maxResults: number;
  /** Description truncation length (default 200). */
  descriptionMax: number;
  /** I-SUB minimum-substring threshold (default 3). */
  minSubstr: number;
}

const DEFAULT_OPTIONS: ConceptOptions = {
  jaccardMin: 0.3,
  maxResults: 10,
  descriptionMax: 200,
  minSubstr: 3,
};

/**
 * Per-query concept extraction (ported from the reference ontology service):
 *
 *   1. Tokenize the query (alpha-prefixed terms, length ≥ 3).
 *   2. For each column, tokenize `column ∪ table` and intersect with the query.
 *   3. Keep candidates whose Jaccard overlap ≥ `jaccardMin`.
 *   4. Rank by `max(jaccard, best I-SUB over query tokens)`.
 *   5. Return the top `maxResults`, highest-confidence first.
 */
export function extractConcepts(
  schema: OntologySchema,
  query: string,
  options: Partial<ConceptOptions> = {},
): ConceptMatch[] {
  const { jaccardMin, maxResults, descriptionMax, minSubstr } = { ...DEFAULT_OPTIONS, ...options };

  const queryTokens = tokenizeQuery(query);
  if (queryTokens.size === 0) {
    return [];
  }

  const matches: ConceptMatch[] = [];
  for (const table of schema) {
    for (const col of table.columns) {
      const identTokens = new Set([...splitIdentifier(col.column), ...splitIdentifier(table.table)]);
      if (identTokens.size === 0) {
        continue;
      }

      const shared = [...queryTokens].filter((token) => identTokens.has(token));
      if (shared.length === 0) {
        continue;
      }

      const union = new Set([...queryTokens, ...identTokens]);
      const jaccard = shared.length / union.size;
      if (jaccard < jaccardMin) {
        continue;
      }

      let bestIsub = 0;
      for (const token of queryTokens) {
        bestIsub = Math.max(bestIsub, isub(token, col.column, minSubstr));
      }
      const confidence = Math.max(jaccard, bestIsub);

      let description = (col.comment ?? `${col.dataType} column in ${table.table}`).trim();
      if (description.length > descriptionMax) {
        description = `${description.slice(0, descriptionMax - 1)}…`;
      }

      matches.push({
        businessTerm: shared[0],
        schemaEntity: `${col.schema}.${col.table}.${col.column}`,
        description,
        confidence,
      });
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return matches.slice(0, maxResults);
}
