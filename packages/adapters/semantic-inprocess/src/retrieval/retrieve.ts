import type { RetrievedTable } from '@qwery/domain';
import type { EmbeddingBackend } from '../embedding/backend';
import { cosineSimilarity } from '../embedding/vector';
import type { SchemaIndex } from './schema-index';

export interface RetrieveOptions {
  /** Number of top columns to seed the table grouping (default 30). */
  topK: number;
}

const DEFAULT_TOP_K = 30;

function tableKey(schema: string, table: string): string {
  return `${schema} ${table}`;
}

/**
 * Score every indexed column against `queryVector`, take the top-k, then
 * force-include every column of any table that has a top-k hit (the schema-
 * linking grouping rule). Tables are returned highest-relevance first; columns
 * keep their index order within a table.
 */
export function retrieveColumns(
  index: SchemaIndex,
  queryVector: number[],
  options: Partial<RetrieveOptions> = {},
): RetrievedTable[] {
  const topK = options.topK ?? DEFAULT_TOP_K;

  const scored = index.columns.map((col) => ({ col, score: cosineSimilarity(col.vector, queryVector) }));
  const ranked = [...scored].sort((a, b) => b.score - a.score).slice(0, topK);

  const matchedTables = new Set(ranked.map((r) => tableKey(r.col.schema, r.col.table)));
  const matchedColumns = new Set(ranked.map((r) => `${tableKey(r.col.schema, r.col.table)} ${r.col.column}`));

  const tables = new Map<string, RetrievedTable>();
  for (const { col, score } of scored) {
    const tKey = tableKey(col.schema, col.table);
    if (!matchedTables.has(tKey)) {
      continue;
    }
    let table = tables.get(tKey);
    if (!table) {
      table = { schema: col.schema, table: col.table, columns: [], maxScore: Number.NEGATIVE_INFINITY };
      tables.set(tKey, table);
    }
    table.columns.push({
      schema: col.schema,
      table: col.table,
      column: col.column,
      dataType: col.dataType,
      comment: col.comment,
      score,
      directMatch: matchedColumns.has(`${tKey} ${col.column}`),
    });
    if (score > table.maxScore) {
      table.maxScore = score;
    }
  }

  return [...tables.values()].sort((a, b) => b.maxScore - a.maxScore);
}

/** Convenience: embed `query` with the same backend, then retrieve. */
export async function retrieve(
  index: SchemaIndex,
  query: string,
  embedder: EmbeddingBackend,
  options: Partial<RetrieveOptions> = {},
): Promise<RetrievedTable[]> {
  const [queryVector] = await embedder.embed([query]);
  return retrieveColumns(index, queryVector, options);
}
