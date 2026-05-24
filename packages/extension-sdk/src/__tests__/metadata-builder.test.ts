import { describe, expect, test } from 'bun:test';
import { buildMetadataFromInformationSchema, metadataFromDescribeRows } from '../metadata-builder';

describe('buildMetadataFromInformationSchema', () => {
  test('groups columns by table and builds the table list', () => {
    const meta = buildMetadataFromInformationSchema({
      driver: 'postgres',
      rows: [
        {
          table_schema: 'public',
          table_name: 'orders',
          column_name: 'id',
          data_type: 'bigint',
          ordinal_position: 1,
          is_nullable: 'NO',
        },
        {
          table_schema: 'public',
          table_name: 'orders',
          column_name: 'total',
          data_type: 'numeric',
          ordinal_position: 2,
          is_nullable: 'YES',
        },
        {
          table_schema: 'public',
          table_name: 'customers',
          column_name: 'id',
          data_type: 'bigint',
          ordinal_position: 1,
          is_nullable: 'NO',
        },
      ],
    });
    expect(meta.driver).toBe('postgres');
    expect(meta.tables).toHaveLength(2);
    expect(meta.columns).toHaveLength(3);
    const orderCols = meta.columns.filter((c) => c.table === 'orders');
    expect(orderCols.map((c) => c.name).sort()).toEqual(['id', 'total']);
    // is_nullable converted from YES/NO
    expect(orderCols.find((c) => c.name === 'id')?.is_nullable).toBe(false);
    expect(orderCols.find((c) => c.name === 'total')?.is_nullable).toBe(true);
  });

  test('attaches primary keys to their owning table', () => {
    const meta = buildMetadataFromInformationSchema({
      driver: 'postgres',
      rows: [
        {
          table_schema: 'public',
          table_name: 'orders',
          column_name: 'id',
          data_type: 'bigint',
          ordinal_position: 1,
          is_nullable: 'NO',
        },
      ],
      primaryKeys: [{ table_schema: 'public', table_name: 'orders', column_name: 'id' }],
    });
    expect(meta.tables[0]?.primary_keys[0]?.name).toBe('id');
  });

  test('attaches foreign keys as relationships', () => {
    const meta = buildMetadataFromInformationSchema({
      driver: 'postgres',
      rows: [
        {
          table_schema: 'public',
          table_name: 'orders',
          column_name: 'customer_id',
          data_type: 'bigint',
          ordinal_position: 1,
          is_nullable: 'NO',
        },
      ],
      foreignKeys: [
        {
          constraint_name: 'orders_customer_id_fkey',
          source_schema: 'public',
          source_table_name: 'orders',
          source_column_name: 'customer_id',
          target_table_schema: 'public',
          target_table_name: 'customers',
          target_column_name: 'id',
        },
      ],
    });
    const rel = meta.tables[0]?.relationships[0];
    expect(rel?.target_table_name).toBe('customers');
    expect(rel?.source_column_name).toBe('customer_id');
  });

  test('produces a schema entry per distinct table_schema', () => {
    const meta = buildMetadataFromInformationSchema({
      driver: 'pg',
      rows: [
        {
          table_schema: 'public',
          table_name: 't',
          column_name: 'c',
          data_type: 'int',
          ordinal_position: 1,
          is_nullable: 'YES',
        },
        {
          table_schema: 'analytics',
          table_name: 't2',
          column_name: 'c',
          data_type: 'int',
          ordinal_position: 1,
          is_nullable: 'YES',
        },
      ],
    });
    expect(meta.schemas.map((s) => s.name).sort()).toEqual(['analytics', 'public']);
  });
});

describe('metadataFromDescribeRows', () => {
  test('treats DuckDB DESCRIBE rows as a single table', () => {
    const meta = metadataFromDescribeRows({
      driver: 'duckdb',
      schema: 'main',
      table: 'orders',
      rows: [
        { column_name: 'id', column_type: 'BIGINT', null: 'NO' },
        { column_name: 'amount', column_type: 'DOUBLE', null: 'YES' },
      ],
    });
    expect(meta.tables).toHaveLength(1);
    expect(meta.columns).toHaveLength(2);
    expect(meta.columns.find((c) => c.name === 'id')?.is_nullable).toBe(false);
    expect(meta.columns.find((c) => c.name === 'amount')?.is_nullable).toBe(true);
  });

  test('defaults missing null field to YES (nullable)', () => {
    const meta = metadataFromDescribeRows({
      driver: 'duckdb',
      schema: 'main',
      table: 'x',
      rows: [{ column_name: 'a', column_type: 'INT' }],
    });
    expect(meta.columns[0]?.is_nullable).toBe(true);
  });
});
