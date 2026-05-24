import { describe, expect, test } from 'bun:test';
import {
  dataPropertyIri,
  objectPropertyIri,
  splitIdentifier,
  toCamel,
  tokenizeQuery,
  toPascal,
  xsdFor,
} from './tokens';

describe('splitIdentifier', () => {
  test('splits snake_case', () => {
    expect(splitIdentifier('customer_orders')).toEqual(['customer', 'orders']);
  });

  test('splits camelCase and PascalCase', () => {
    expect(splitIdentifier('grossAmountCents')).toEqual(['gross', 'amount', 'cents']);
    expect(splitIdentifier('OrderID')).toEqual(['order', 'id']);
  });

  test('splits on non-word runs', () => {
    expect(splitIdentifier('a-b c')).toEqual(['a', 'b', 'c']);
  });

  test('returns no tokens for an empty identifier', () => {
    expect(splitIdentifier('')).toEqual([]);
  });
});

describe('toPascal / toCamel', () => {
  test('toPascal joins capitalized tokens', () => {
    expect(toPascal('customer_orders')).toBe('CustomerOrders');
  });

  test('toPascal falls back to Unknown when empty', () => {
    expect(toPascal('')).toBe('Unknown');
  });

  test('toCamel lower-leads then capitalizes the rest', () => {
    expect(toCamel('customer_orders')).toBe('customerOrders');
    expect(toCamel('name')).toBe('name');
  });

  test('toCamel falls back to unknown when empty', () => {
    expect(toCamel('')).toBe('unknown');
  });
});

describe('IRI helpers', () => {
  test('dataPropertyIri camelCases the column', () => {
    expect(dataPropertyIri('gross_amount')).toBe('ex:grossAmount');
  });

  test('objectPropertyIri strips a trailing id token', () => {
    expect(objectPropertyIri('customer_id')).toBe('ex:hasCustomer');
  });

  test('objectPropertyIri keeps non-id columns', () => {
    expect(objectPropertyIri('name')).toBe('ex:hasName');
  });

  test('objectPropertyIri falls back to Target for a bare id column', () => {
    expect(objectPropertyIri('id')).toBe('ex:hasTarget');
  });

  test('objectPropertyIri falls back to Target for an empty column', () => {
    expect(objectPropertyIri('')).toBe('ex:hasTarget');
  });
});

describe('tokenizeQuery', () => {
  test('keeps alpha-prefixed terms of length ≥ 3 and de-duplicates', () => {
    expect(tokenizeQuery('Show me TOP revenue revenue by id')).toEqual(new Set(['show', 'top', 'revenue']));
  });

  test('returns an empty set when nothing matches', () => {
    expect(tokenizeQuery('')).toEqual(new Set());
  });
});

describe('xsdFor', () => {
  test('maps integer-like types', () => {
    expect(xsdFor('BIGINT')).toBe('xsd:integer');
    expect(xsdFor('serial')).toBe('xsd:integer');
  });

  test('maps decimal-like types', () => {
    expect(xsdFor('double precision')).toBe('xsd:decimal');
  });

  test('maps boolean', () => {
    expect(xsdFor('boolean')).toBe('xsd:boolean');
  });

  test('maps date but not datetime', () => {
    expect(xsdFor('date')).toBe('xsd:date');
  });

  test('maps timestamp and datetime to dateTime', () => {
    expect(xsdFor('timestamp')).toBe('xsd:dateTime');
    expect(xsdFor('datetime')).toBe('xsd:dateTime');
  });

  test('falls back to string', () => {
    expect(xsdFor('varchar')).toBe('xsd:string');
  });
});
