import type { EmbeddingBackend } from '../embedding/backend';
import type { OntologySchema } from '../ontology/model';
import { buildColumnEmbeddingText } from './embedding-text';

/** One indexed column: its identity plus the embedding of its descriptor text. */
export interface ColumnVector {
  schema: string;
  table: string;
  column: string;
  dataType: string;
  comment?: string;
  vector: number[];
}

/** Pre-computed column embeddings for a datasource, built once at attach time. */
export interface SchemaIndex {
  dimensions: number;
  columns: ColumnVector[];
}

/**
 * Embed every column of a schema into a queryable index. Built once when a
 * datasource is attached; `retrieveColumns` then scores the cached vectors
 * against a query vector with no further embedding of the catalog.
 */
export async function buildSchemaIndex(
  schema: OntologySchema,
  embedder: EmbeddingBackend,
): Promise<SchemaIndex> {
  const columns = schema.flatMap((table) => table.columns);
  const vectors = await embedder.embed(columns.map(buildColumnEmbeddingText));
  return {
    dimensions: embedder.dimensions,
    columns: columns.map((col, i) => ({
      schema: col.schema,
      table: col.table,
      column: col.column,
      dataType: col.dataType,
      comment: col.comment,
      vector: vectors[i],
    })),
  };
}
