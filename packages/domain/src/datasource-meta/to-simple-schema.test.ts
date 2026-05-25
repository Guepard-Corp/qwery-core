import { describe, expect, test } from 'bun:test';
import type { DatasourceMetadata } from './metadata.type';
import { toSimpleSchema } from './to-simple-schema';

function meta(columns: Array<Partial<DatasourceMetadata['columns'][number]>>): DatasourceMetadata {
  return {
    version: '0.0.1',
    driver: 'test',
    schemas: [],
    tables: [],
    columns: columns.map((c, i) => ({
      id: c.id ?? `${i}`,
      table_id: c.table_id ?? 1,
      schema: c.schema ?? 'main',
      table: c.table ?? 'data',
      name: c.name ?? `col${i}`,
      ordinal_position: c.ordinal_position ?? i + 1,
      data_type: c.data_type ?? 'VARCHAR',
      format: c.data_type ?? 'VARCHAR',
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
    })),
  };
}

describe('toSimpleSchema', () => {
  test('groups columns into schema → table → columns', () => {
    const result = toSimpleSchema(
      meta([
        { schema: 'main', table: 'orders', name: 'id', data_type: 'BIGINT', ordinal_position: 1 },
        { schema: 'main', table: 'orders', name: 'total', data_type: 'DECIMAL', ordinal_position: 2 },
        { schema: 'main', table: 'customers', name: 'email', data_type: 'VARCHAR', ordinal_position: 1 },
      ]),
      'memory',
    );
    expect(result).toEqual([
      {
        databaseName: 'memory',
        schemaName: 'main',
        tables: [
          { tableName: 'customers', columns: [{ columnName: 'email', columnType: 'VARCHAR' }] },
          {
            tableName: 'orders',
            columns: [
              { columnName: 'id', columnType: 'BIGINT' },
              { columnName: 'total', columnType: 'DECIMAL' },
            ],
          },
        ],
      },
    ]);
  });

  test('preserves ordinal order and sorts schemas/tables by name', () => {
    const result = toSimpleSchema(
      meta([
        { schema: 'sales', table: 't', name: 'b', ordinal_position: 2 },
        { schema: 'sales', table: 't', name: 'a', ordinal_position: 1 },
        { schema: 'analytics', table: 't', name: 'x', ordinal_position: 1 },
      ]),
      'db',
    );
    expect(result.map((s) => s.schemaName)).toEqual(['analytics', 'sales']);
    expect(result[1]?.tables[0]?.columns.map((c) => c.columnName)).toEqual(['a', 'b']);
  });

  test('returns an empty array when there are no columns', () => {
    expect(toSimpleSchema(meta([]), 'db')).toEqual([]);
  });
});
