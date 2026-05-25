import { describe, expect, test } from 'bun:test';
import { createHashingEmbedder } from '../embedding/hashing';
import type { OntologyColumn, OntologySchema, OntologyTable } from '../ontology/model';
import { retrieve, retrieveColumns } from './retrieve';
import { buildSchemaIndex, type ColumnVector, type SchemaIndex } from './schema-index';

function cv(table: string, column: string, vector: number[]): ColumnVector {
  return { schema: 'main', table, column, dataType: 'VARCHAR', vector };
}

const index: SchemaIndex = {
  dimensions: 2,
  columns: [
    cv('sales', 'revenue', [1, 0]),
    cv('sales', 'cost', [0, 1]),
    cv('orders', 'total', [1, 0]),
    cv('orders', 'note', [-1, 0]),
    cv('audit', 'ts', [0, -1]),
  ],
};

describe('retrieveColumns', () => {
  test('groups top-k hits with their table-mates, ranked by table relevance', () => {
    const result = retrieveColumns(index, [1, 0], { topK: 2 });

    expect(result.map((t) => t.table)).toEqual(['sales', 'orders']);

    const sales = result[0];
    expect(sales?.maxScore).toBe(1);
    expect(sales?.columns).toEqual([
      {
        schema: 'main',
        table: 'sales',
        column: 'revenue',
        dataType: 'VARCHAR',
        comment: undefined,
        score: 1,
        directMatch: true,
      },
      {
        schema: 'main',
        table: 'sales',
        column: 'cost',
        dataType: 'VARCHAR',
        comment: undefined,
        score: 0,
        directMatch: false,
      },
    ]);

    const orders = result[1];
    expect(orders?.columns.map((c) => [c.column, c.directMatch])).toEqual([
      ['total', true],
      ['note', false],
    ]);
  });

  test('excludes tables with no top-k hit', () => {
    const tables = retrieveColumns(index, [1, 0], { topK: 2 }).map((t) => t.table);
    expect(tables).not.toContain('audit');
  });

  test('defaults to a wide top-k that admits every table', () => {
    expect(
      retrieveColumns(index, [1, 0])
        .map((t) => t.table)
        .sort(),
    ).toEqual(['audit', 'orders', 'sales']);
  });

  test('returns nothing for an empty index', () => {
    expect(retrieveColumns({ dimensions: 2, columns: [] }, [1, 0])).toEqual([]);
  });
});

describe('retrieve', () => {
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

  test('embeds the query and ranks the matching column first', async () => {
    const embedder = createHashingEmbedder();
    const schema: OntologySchema = [
      otable('sales', [ocol('revenue'), ocol('region')]),
      otable('orders', [ocol('id', { table: 'orders' })]),
    ];
    const built = await buildSchemaIndex(schema, embedder);
    const result = await retrieve(built, 'revenue', embedder, { topK: 1 });
    const direct = result[0]?.columns.find((c) => c.directMatch);
    expect(direct?.column).toBe('revenue');
  });
});
