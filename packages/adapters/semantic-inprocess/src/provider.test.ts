import { describe, expect, test } from 'bun:test';
import type { DatasourceMetadata } from '@qwery/domain';
import { createInProcessOntologyProvider } from './index';

const metadata: DatasourceMetadata = {
  version: '0.0.1',
  driver: 'test',
  schemas: [],
  columns: [
    {
      id: '0',
      table_id: 1,
      schema: 'main',
      table: 'sales',
      name: 'revenue',
      ordinal_position: 1,
      data_type: 'DECIMAL',
      format: 'DECIMAL',
      is_identity: false,
      identity_generation: null,
      is_generated: false,
      is_nullable: true,
      is_updatable: true,
      is_unique: false,
      check: null,
      default_value: null,
      enums: [],
      comment: 'gross revenue',
    },
  ],
  tables: [
    {
      id: 1,
      schema: 'main',
      name: 'sales',
      rls_enabled: false,
      rls_forced: false,
      bytes: 0,
      size: '0',
      live_rows_estimate: 0,
      dead_rows_estimate: 0,
      comment: null,
      primary_keys: [],
      relationships: [],
    },
  ],
};

describe('createInProcessOntologyProvider', () => {
  const provider = createInProcessOntologyProvider();

  test('getConcepts matches query terms to schema entities', () => {
    const concepts = provider.getConcepts(metadata, 'total revenue');
    expect(concepts[0]).toMatchObject({
      businessTerm: 'revenue',
      schemaEntity: 'main.sales.revenue',
    });
  });

  test('getConcepts honors an explicit maxResults', () => {
    expect(provider.getConcepts(metadata, 'revenue', 0)).toEqual([]);
  });

  test('getConstraints derives rules from the metadata', () => {
    const rules = provider.getConstraints(metadata);
    expect(rules.map((r) => r.ruleType)).toEqual(['domain', 'range']);
    expect(rules[1]?.constraint).toContain('xsd:decimal');
  });
});
