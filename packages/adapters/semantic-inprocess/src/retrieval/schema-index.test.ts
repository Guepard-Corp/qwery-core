import { describe, expect, test } from 'bun:test';
import { createHashingEmbedder } from '../embedding/hashing';
import type { OntologyColumn, OntologySchema, OntologyTable } from '../ontology/model';
import { buildSchemaIndex } from './schema-index';

function ocol(column: string, over: Partial<OntologyColumn> = {}): OntologyColumn {
  return {
    schema: 'main',
    table: 'sales',
    column,
    dataType: 'VARCHAR',
    isNullable: true,
    isPrimaryKey: false,
    ...over,
  };
}

function otable(table: string, columns: OntologyColumn[]): OntologyTable {
  return { schema: 'main', table, columns: columns.map((c) => ({ ...c, table })) };
}

describe('buildSchemaIndex', () => {
  const embedder = createHashingEmbedder({ dimensions: 32 });

  test('embeds every column and carries its identity', async () => {
    const schema: OntologySchema = [
      otable('sales', [ocol('revenue', { comment: 'gross' }), ocol('region')]),
      otable('orders', [ocol('id', { table: 'orders' })]),
    ];
    const index = await buildSchemaIndex(schema, embedder);
    expect(index.dimensions).toBe(32);
    expect(index.columns).toHaveLength(3);
    expect(index.columns[0]).toMatchObject({ table: 'sales', column: 'revenue', comment: 'gross' });
    expect(index.columns[0]?.vector).toHaveLength(32);
  });

  test('handles an empty schema', async () => {
    const index = await buildSchemaIndex([], embedder);
    expect(index.columns).toEqual([]);
  });
});
