import { describe, expect, test } from 'bun:test';
import type { OntologyColumn } from '../ontology/model';
import { buildColumnEmbeddingText } from './embedding-text';

function ocol(over: Partial<OntologyColumn>): OntologyColumn {
  return {
    schema: 'main',
    table: 'sales',
    column: 'revenue',
    dataType: 'DECIMAL',
    isNullable: true,
    isPrimaryKey: false,
    ...over,
  };
}

describe('buildColumnEmbeddingText', () => {
  test('includes the comment when present', () => {
    expect(buildColumnEmbeddingText(ocol({ comment: 'gross revenue' }))).toBe(
      'main.sales.revenue DECIMAL gross revenue',
    );
  });

  test('omits the comment when absent', () => {
    expect(buildColumnEmbeddingText(ocol({}))).toBe('main.sales.revenue DECIMAL');
  });
});
