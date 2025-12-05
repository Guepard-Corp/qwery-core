import type {
  BusinessContext,
  Relationship,
} from '../types/business-context.types';
import { toSingular } from './business-context.utils';

/**
 * Translate business term to column(s) with confidence scores
 */
export function translateBusinessTermToColumn(
  context: BusinessContext,
  term: string,
  viewName?: string,
): Array<{ column: string; view: string; confidence: number }> {
  const results: Array<{ column: string; view: string; confidence: number }> =
    [];
  const termLower = term.toLowerCase();
  const singularTerm = toSingular(termLower);

  // Direct vocabulary lookup
  const entry =
    context.vocabulary.get(termLower) || context.vocabulary.get(singularTerm);
  if (entry) {
    for (const techTerm of entry.technicalTerms) {
      // Find which view(s) contain this column
      for (const entity of context.entities.values()) {
        if (entity.columns.includes(techTerm)) {
          for (const view of entity.views) {
            if (!viewName || view === viewName) {
              results.push({
                column: techTerm,
                view,
                confidence: entry.confidence,
              });
            }
          }
        }
      }
    }
  }

  // Synonym lookup
  for (const [_vocabTerm, vocabEntry] of context.vocabulary.entries()) {
    if (
      vocabEntry.synonyms.includes(termLower) ||
      vocabEntry.synonyms.includes(singularTerm)
    ) {
      for (const techTerm of vocabEntry.technicalTerms) {
        for (const entity of context.entities.values()) {
          if (entity.columns.includes(techTerm)) {
            for (const view of entity.views) {
              if (!viewName || view === viewName) {
                results.push({
                  column: techTerm,
                  view,
                  confidence: vocabEntry.confidence * 0.8, // Lower confidence for synonyms
                });
              }
            }
          }
        }
      }
    }
  }

  // Partial match (fuzzy)
  for (const [vocabTerm, vocabEntry] of context.vocabulary.entries()) {
    if (vocabTerm.includes(termLower) || termLower.includes(vocabTerm)) {
      for (const techTerm of vocabEntry.technicalTerms) {
        for (const entity of context.entities.values()) {
          if (entity.columns.includes(techTerm)) {
            for (const view of entity.views) {
              if (!viewName || view === viewName) {
                results.push({
                  column: techTerm,
                  view,
                  confidence: vocabEntry.confidence * 0.6, // Lower confidence for partial matches
                });
              }
            }
          }
        }
      }
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  // Remove duplicates
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.view}.${r.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Suggest JOIN conditions for multiple views
 */
export function suggestJoins(
  context: BusinessContext,
  viewNames: string[],
): Relationship[] {
  return context.relationships.filter(
    (rel) => viewNames.includes(rel.fromView) && viewNames.includes(rel.toView),
  );
}

/**
 * Get all columns belonging to an entity across views
 */
export function getEntityColumns(
  context: BusinessContext,
  entityName: string,
): Array<{ column: string; view: string }> {
  const results: Array<{ column: string; view: string }> = [];
  const entityKey = entityName.toLowerCase();

  const entity = context.entities.get(entityKey);
  if (entity) {
    for (const column of entity.columns) {
      for (const view of entity.views) {
        results.push({ column, view });
      }
    }
  }

  return results;
}
