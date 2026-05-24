import { describe, expect, test } from 'bun:test';
import { extractConcepts } from './concepts';
import type { OntologyColumn, OntologySchema, OntologyTable } from './model';

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

describe('extractConcepts', () => {
  test('returns nothing when the query has no usable tokens', () => {
    const schema: OntologySchema = [otable('sales', [ocol('revenue')])];
    expect(extractConcepts(schema, 'a b')).toEqual([]);
  });

  test('skips columns whose identifiers tokenize to nothing', () => {
    const schema: OntologySchema = [otable('_', [ocol('_')]), otable('sales', [ocol('revenue')])];
    const result = extractConcepts(schema, 'revenue');
    expect(result).toHaveLength(1);
    expect(result[0]?.schemaEntity).toBe('main.sales.revenue');
  });

  test('skips columns that share no token with the query', () => {
    const schema: OntologySchema = [otable('sales', [ocol('amount')])];
    expect(extractConcepts(schema, 'revenue')).toEqual([]);
  });

  test('drops candidates below the Jaccard floor', () => {
    const schema: OntologySchema = [otable('x', [ocol('revenue', { table: 'x' })])];
    expect(extractConcepts(schema, 'revenue customer orders monthly total')).toEqual([]);
  });

  test('uses the column comment as the description', () => {
    const schema: OntologySchema = [
      otable('sales', [ocol('revenue', { comment: 'gross revenue in cents' })]),
    ];
    const result = extractConcepts(schema, 'revenue');
    expect(result[0]).toMatchObject({
      businessTerm: 'revenue',
      schemaEntity: 'main.sales.revenue',
      description: 'gross revenue in cents',
      confidence: 1,
    });
  });

  test('synthesizes a description when the column has no comment', () => {
    const schema: OntologySchema = [otable('sales', [ocol('revenue', { dataType: 'DECIMAL' })])];
    expect(extractConcepts(schema, 'revenue')[0]?.description).toBe('DECIMAL column in sales');
  });

  test('truncates descriptions longer than the limit', () => {
    const schema: OntologySchema = [otable('sales', [ocol('revenue', { comment: 'x'.repeat(250) })])];
    const description = extractConcepts(schema, 'revenue')[0]?.description ?? '';
    expect(description).toHaveLength(200);
    expect(description.endsWith('…')).toBe(true);
  });

  test('ranks by I-SUB when it beats the Jaccard score', () => {
    const schema: OntologySchema = [otable('t', [ocol('gross_revenue', { table: 't' })])];
    expect(extractConcepts(schema, 'revenue')[0]?.confidence).toBeCloseTo(0.7, 2);
  });

  test('limits results to maxResults, highest confidence first', () => {
    const schema: OntologySchema = [
      otable('sales', [ocol('revenue'), ocol('gross_revenue'), ocol('revenue_total')]),
    ];
    const result = extractConcepts(schema, 'revenue', { maxResults: 2 });
    expect(result).toHaveLength(2);
    expect(result[0]?.confidence).toBeGreaterThanOrEqual(result[1]?.confidence ?? 0);
  });
});
