import { describe, expect, test } from 'bun:test';
import type { Column, DatasourceMetadata, Table } from '@qwery/domain';
import { normalizeMetadata } from './normalize';

function col(over: Partial<Column>): Column {
  return {
    id: '0',
    table_id: 1,
    schema: 'main',
    table: 'orders',
    name: 'col',
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
    ...over,
  };
}

function table(over: Partial<Table>): Table {
  return {
    id: 1,
    schema: 'main',
    name: 'orders',
    rls_enabled: false,
    rls_forced: false,
    bytes: 0,
    size: '0',
    live_rows_estimate: 0,
    dead_rows_estimate: 0,
    comment: null,
    primary_keys: [],
    relationships: [],
    ...over,
  };
}

const metadata: DatasourceMetadata = {
  version: '0.0.1',
  driver: 'test',
  schemas: [],
  columns: [
    col({ table: 'orders', name: 'id', data_type: 'BIGINT', comment: null }),
    col({ table: 'orders', name: 'customer_id', data_type: 'BIGINT', comment: 'fk' }),
    col({ table: 'orders', name: 'note', data_type: 'VARCHAR', comment: 'free text' }),
    col({ table: 'customers', name: 'id', data_type: 'BIGINT', comment: null }),
  ],
  tables: [
    table({
      name: 'orders',
      primary_keys: [{ table_id: 1, schema: 'main', table_name: 'orders', name: 'id' }],
      relationships: [
        {
          id: 1,
          constraint_name: 'orders_customer_fk',
          source_schema: 'main',
          source_table_name: 'orders',
          source_column_name: 'customer_id',
          target_table_schema: 'main',
          target_table_name: 'customers',
          target_column_name: 'id',
        },
      ],
    }),
    table({
      id: 2,
      name: 'customers',
      primary_keys: [{ table_id: 2, schema: 'main', table_name: 'customers', name: 'id' }],
    }),
  ],
};

describe('normalizeMetadata', () => {
  const result = normalizeMetadata(metadata);

  test('groups columns into their tables in first-seen order', () => {
    expect(result.map((t) => t.table)).toEqual(['orders', 'customers']);
    expect(result[0]?.columns.map((c) => c.column)).toEqual(['id', 'customer_id', 'note']);
  });

  test('marks primary-key columns', () => {
    expect(result[0]?.columns[0]).toMatchObject({ column: 'id', isPrimaryKey: true });
    expect(result[1]?.columns[0]).toMatchObject({ column: 'id', isPrimaryKey: true });
  });

  test('resolves foreign-key targets from relationships', () => {
    expect(result[0]?.columns[1]).toMatchObject({
      column: 'customer_id',
      isPrimaryKey: false,
      foreignKeyTarget: 'main.customers.id',
    });
  });

  test('leaves plain columns without PK/FK markers', () => {
    expect(result[0]?.columns[2]).toMatchObject({
      column: 'note',
      isPrimaryKey: false,
      foreignKeyTarget: undefined,
    });
  });

  test('maps null comments to undefined and keeps present comments', () => {
    expect(result[0]?.columns[0]?.comment).toBeUndefined();
    expect(result[0]?.columns[2]?.comment).toBe('free text');
  });
});
