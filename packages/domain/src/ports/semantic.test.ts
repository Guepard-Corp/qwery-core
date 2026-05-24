import { describe, expect, test } from 'bun:test';
import type { DatasourceMetadata } from '../datasource-meta/metadata.type';
import { NullOntologyProvider } from './semantic';

const emptyMetadata = {
  version: '0.0.1',
  driver: 'test',
  schemas: [],
  tables: [],
  columns: [],
} satisfies DatasourceMetadata;

describe('NullOntologyProvider', () => {
  test('getConcepts returns no matches', () => {
    expect(NullOntologyProvider.getConcepts(emptyMetadata, 'revenue last quarter')).toEqual([]);
  });

  test('getConstraints returns no rules', () => {
    expect(NullOntologyProvider.getConstraints(emptyMetadata)).toEqual([]);
  });
});
