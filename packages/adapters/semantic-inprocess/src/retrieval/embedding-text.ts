import type { OntologyColumn } from '../ontology/model';

/**
 * Text fed to the embedder for one column. Combines the fully-qualified name,
 * the data type, and the comment (when present) so the vector captures both the
 * physical identifier and any business description attached to it.
 */
export function buildColumnEmbeddingText(col: OntologyColumn): string {
  const parts = [`${col.schema}.${col.table}.${col.column}`, col.dataType];
  if (col.comment) {
    parts.push(col.comment);
  }
  return parts.join(' ');
}
