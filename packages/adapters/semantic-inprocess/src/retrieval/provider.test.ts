import { describe, expect, test } from 'bun:test';
import type { Column, DatasourceMetadata } from '@qwery/domain';
import type { EmbeddingBackend } from '../embedding/backend';
import { createHashingEmbedder } from '../embedding/hashing';
import { createInProcessSchemaRetriever, schemaSignature } from './provider';

/** Wraps an embedder to count how many times `embed` is invoked. */
function countingEmbedder(): { backend: EmbeddingBackend; calls: () => number } {
  const base = createHashingEmbedder();
  let calls = 0;
  return {
    backend: {
      dimensions: base.dimensions,
      embed: (texts) => {
        calls += 1;
        return base.embed(texts);
      },
    },
    calls: () => calls,
  };
}

function col(table: string, name: string): Column {
  return {
    id: `${table}.${name}`,
    table_id: 1,
    schema: 'main',
    table,
    name,
    ordinal_position: 1,
    data_type: 'VARCHAR',
    format: 'VARCHAR',
    is_identity: false,
    identity_generation: null,
    is_generated: false,
    is_nullable: true,
    is_updatable: true,
    is_unique: false,
    check: null,
    default_value: null,
    enums: [],
    comment: null,
  };
}

function meta(columns: Column[]): DatasourceMetadata {
  return { version: '0', driver: 'test', schemas: [], tables: [], columns };
}

const metadata = meta([col('sales', 'revenue'), col('sales', 'region'), col('orders', 'id')]);
const otherMetadata = meta([col('billing', 'amount')]);

describe('schemaSignature', () => {
  test('is stable for the same columns and changes when they change', () => {
    expect(schemaSignature(metadata)).toBe(schemaSignature(meta([...metadata.columns])));
    expect(schemaSignature(metadata)).not.toBe(schemaSignature(otherMetadata));
  });
});

describe('createInProcessSchemaRetriever', () => {
  test('retrieves the query-relevant table from metadata', async () => {
    const retriever = createInProcessSchemaRetriever(createHashingEmbedder());
    const tables = await retriever.retrieve(metadata, 'revenue', { topK: 1 });
    const direct = tables[0]?.columns.find((c) => c.directMatch);
    expect(direct?.column).toBe('revenue');
    expect(tables[0]?.table).toBe('sales');
  });

  test('defaults topK when no options are given', async () => {
    const retriever = createInProcessSchemaRetriever(createHashingEmbedder());
    const tables = await retriever.retrieve(metadata, 'revenue');
    expect(tables.length).toBeGreaterThan(0);
  });

  test('builds the index once and reuses it for the same schema', async () => {
    const counting = countingEmbedder();
    const retriever = createInProcessSchemaRetriever(counting.backend);
    await retriever.retrieve(metadata, 'revenue'); // build (columns) + query = 2
    await retriever.retrieve(metadata, 'region'); // cache hit → query only = 1
    expect(counting.calls()).toBe(3);
  });

  test('evicts the oldest index past the cache cap and rebuilds it', async () => {
    const counting = countingEmbedder();
    const retriever = createInProcessSchemaRetriever(counting.backend, { maxCacheEntries: 1 });
    await retriever.retrieve(metadata, 'revenue'); // build A + query = 2
    await retriever.retrieve(otherMetadata, 'amount'); // build B + query = 2 → evicts A
    await retriever.retrieve(metadata, 'revenue'); // A evicted → rebuild + query = 2
    expect(counting.calls()).toBe(6);
  });
});
