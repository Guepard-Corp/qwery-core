import { describe, expect, test } from 'bun:test';
import { detectHeuristicFks, extractConstraints } from './constraints';
import type { OntologyColumn, OntologySchema, OntologyTable } from './model';

function ocol(column: string, over: Partial<OntologyColumn> = {}): OntologyColumn {
  return {
    schema: 'main',
    table: 't',
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

describe('detectHeuristicFks', () => {
  const pk = (column: string) => ocol(column, { isPrimaryKey: true });

  test('skips columns with a declared foreign key', () => {
    const schema: OntologySchema = [
      otable('product', [pk('id')]),
      otable('inventory', [ocol('product_id', { foreignKeyTarget: 'main.product.id' })]),
    ];
    expect(detectHeuristicFks(schema).size).toBe(0);
  });

  test('detects the <other>_id pattern', () => {
    const schema: OntologySchema = [otable('product', [pk('id')]), otable('inventory', [ocol('product_id')])];
    expect(detectHeuristicFks(schema).get('main inventory product_id')).toMatchObject({
      table: 'product',
      column: 'id',
      confidence: 0.7,
    });
  });

  test('detects the <other>id pattern without an underscore', () => {
    const schema: OntologySchema = [otable('product', [pk('id')]), otable('inventory', [ocol('productid')])];
    expect(detectHeuristicFks(schema).has('main inventory productid')).toBe(true);
  });

  test('ignores a bare id column', () => {
    const schema: OntologySchema = [otable('t', [pk('id')])];
    expect(detectHeuristicFks(schema).size).toBe(0);
  });

  test('ignores a column with no matching target table', () => {
    const schema: OntologySchema = [otable('inventory', [ocol('widget_id')])];
    expect(detectHeuristicFks(schema).size).toBe(0);
  });

  test('ignores a self-referential match', () => {
    const schema: OntologySchema = [otable('sales', [pk('id'), ocol('sales_id')])];
    expect(detectHeuristicFks(schema).size).toBe(0);
  });

  test('ignores a target table without a primary key', () => {
    const schema: OntologySchema = [otable('tag', [ocol('label')]), otable('post', [ocol('tag_id')])];
    expect(detectHeuristicFks(schema).size).toBe(0);
  });
});

describe('extractConstraints', () => {
  const schema: OntologySchema = [
    otable('orders', [
      ocol('id', { isPrimaryKey: true, dataType: 'BIGINT' }),
      ocol('customer_id', { foreignKeyTarget: 'main.customers.id', dataType: 'BIGINT' }),
      ocol('total', { dataType: 'DECIMAL' }),
    ]),
    otable('customers', [ocol('id', { isPrimaryKey: true, dataType: 'BIGINT' })]),
    otable('product', [ocol('id', { isPrimaryKey: true, dataType: 'BIGINT' })]),
    otable('inventory', [ocol('product_id', { dataType: 'BIGINT' }), ocol('qty', { dataType: 'INT' })]),
  ];
  const rules = extractConstraints(schema);

  const find = (ruleType: string, subjectColumn: string, table: string) =>
    rules.find(
      (r) => r.ruleType === ruleType && r.subjectColumn === subjectColumn && r.subjectTable === table,
    );

  test('emits three rules per FK and two per plain column', () => {
    // orders: id(2) + customer_id(3) + total(2); customers: id(2);
    // product: id(2); inventory: product_id(3) + qty(2) = 16.
    expect(rules).toHaveLength(16);
  });

  test('declared FK columns get ObjectProperty rules at full confidence', () => {
    expect(find('range', 'customer_id', 'orders')).toMatchObject({
      propertyIri: 'ex:hasCustomer',
      objectTable: 'customers',
      objectColumn: 'id',
      confidence: 1,
    });
    expect(find('domain', 'customer_id', 'orders')?.constraint).toContain('ex:Orders');
    expect(find('domain_range', 'customer_id', 'orders')).toBeDefined();
  });

  test('heuristic FK columns get rules at reduced confidence', () => {
    expect(find('range', 'product_id', 'inventory')).toMatchObject({
      propertyIri: 'ex:hasProduct',
      objectTable: 'product',
      confidence: 0.7,
    });
  });

  test('plain columns get DataProperty domain and XSD range rules', () => {
    expect(find('domain', 'total', 'orders')?.propertyIri).toBe('ex:total');
    expect(find('range', 'total', 'orders')?.constraint).toContain('xsd:decimal');
    expect(find('range', 'qty', 'inventory')?.constraint).toContain('xsd:integer');
  });
});
