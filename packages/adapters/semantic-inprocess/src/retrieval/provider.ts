import type { DatasourceMetadata, RetrievedTable, SchemaRetriever } from '@qwery/domain';
import type { EmbeddingBackend } from '../embedding/backend';
import { normalizeMetadata } from '../ontology/normalize';
import { retrieve } from './retrieve';
import { buildSchemaIndex, type SchemaIndex } from './schema-index';

/** Default number of distinct schema indexes kept in the retriever's cache. */
const DEFAULT_MAX_CACHE_ENTRIES = 16;

/**
 * Content signature of a schema: every column's qualified name + data type.
 * Two metadata snapshots with the same columns share a cached index; any
 * column add/remove/retype changes the signature and forces a rebuild.
 */
export function schemaSignature(metadata: DatasourceMetadata): string {
  return metadata.columns.map((c) => `${c.schema}.${c.table}.${c.name}:${c.data_type}`).join('|');
}

export interface SchemaRetrieverOptions {
  /** Max distinct schema indexes to cache before evicting the oldest (default 16). */
  maxCacheEntries?: number;
}

/**
 * In-process {@link SchemaRetriever} backed by an injected {@link EmbeddingBackend}.
 * The column embedding index is built once per distinct schema and cached
 * (keyed by {@link schemaSignature}), so repeated per-turn queries against an
 * unchanged datasource only embed the query — not the whole catalog. The cache
 * is bounded with FIFO eviction to stay flat across many datasources.
 */
export function createInProcessSchemaRetriever(
  embedder: EmbeddingBackend,
  options: SchemaRetrieverOptions = {},
): SchemaRetriever {
  const maxEntries = options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
  const cache = new Map<string, SchemaIndex>();

  return {
    retrieve: async (
      metadata: DatasourceMetadata,
      query: string,
      retrieveOptions?: { topK?: number },
    ): Promise<RetrievedTable[]> => {
      const key = schemaSignature(metadata);
      let index = cache.get(key);
      if (!index) {
        index = await buildSchemaIndex(normalizeMetadata(metadata), embedder);
        cache.set(key, index);
        if (cache.size > maxEntries) {
          for (const oldest of cache.keys()) {
            cache.delete(oldest);
            break;
          }
        }
      }
      return retrieve(index, query, embedder, retrieveOptions);
    },
  };
}
