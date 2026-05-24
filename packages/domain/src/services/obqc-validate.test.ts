import { describe, expect, test } from 'bun:test';
import type { OBQCRule } from '../ports/semantic';
import { validateQuery } from './obqc-validate';

const rules: OBQCRule[] = [
  // subjectColumn present; object fields absent
  {
    ruleType: 'domain',
    subjectTable: 'orders',
    subjectColumn: 'total',
    propertyIri: 'ex:total',
    constraint: '',
    confidence: 1,
  },
  // all fields present (covers objectTable / objectColumn vocab branches)
  {
    ruleType: 'range',
    subjectTable: 'orders',
    subjectColumn: 'customer_id',
    propertyIri: 'ex:hasCustomer',
    constraint: '',
    objectTable: 'customers',
    objectColumn: 'id',
    confidence: 1,
  },
  // subjectColumn absent (covers the false branch)
  { ruleType: 'domain', subjectTable: 'orders', propertyIri: 'ex:orders', constraint: '', confidence: 1 },
];

describe('validateQuery', () => {
  test('fails open when there are no rules', () => {
    expect(validateQuery('SELECT x.y FROM z', [])).toEqual({ valid: true, violations: [] });
  });

  test('passes when every qualified reference is known', () => {
    expect(validateQuery('SELECT orders.total, c.id FROM orders JOIN customers c', rules)).toEqual({
      valid: true,
      violations: [],
    });
  });

  test('flags a hallucinated column and emits a repair prompt', () => {
    const result = validateQuery('SELECT o.revenue FROM orders o', rules);
    expect(result.valid).toBe(false);
    expect(result.violations).toEqual([
      {
        ruleType: 'incorrect_property',
        entity: 'revenue',
        explanation:
          '"revenue" is not defined in the schema. Use only columns and tables that exist in the provided schema.',
      },
    ]);
    expect(result.repairPrompt).toContain('revenue');
    expect(result.repairPrompt).toContain('SELECT o.revenue FROM orders o');
  });

  test('ignores a star projection', () => {
    expect(validateQuery('SELECT t.* FROM orders t', rules).valid).toBe(true);
  });

  test('ignores dotted text inside string literals', () => {
    expect(validateQuery("SELECT orders.total FROM orders WHERE note = 'a.bad'", rules).valid).toBe(true);
  });

  test('reports each unknown identifier only once', () => {
    const result = validateQuery('SELECT o.bad, x.bad FROM orders o', rules);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.entity).toBe('bad');
  });
});
