import { describe, expect, test } from 'bun:test';
import {
  HELPER_NAMES,
  MUSTACHE_HELPERS,
  renderAlignedTable,
  renderTemplate,
  TABLE_SENTINEL,
  validateTemplateColumns,
} from '../mustache-helpers';

describe('renderTemplate — helpers', () => {
  test('money helper formats a number as USD currency', () => {
    const out = renderTemplate('Revenue: {{#money}}{{first.rev}}{{/money}}', [{ rev: 1234.5 }]);
    expect(out).toBe('Revenue: $1,234.50');
  });

  test('money helper passes through non-numeric text', () => {
    const out = renderTemplate('{{#money}}not a number{{/money}}', [{}]);
    expect(out).toBe('not a number');
  });

  test('int helper rounds and groups', () => {
    const out = renderTemplate('{{#int}}{{first.n}}{{/int}}', [{ n: 1234567.89 }]);
    expect(out).toBe('1,234,568');
  });

  test('pct helper treats [0,1] as fraction', () => {
    expect(renderTemplate('{{#pct}}{{first.p}}{{/pct}}', [{ p: 0.42 }])).toBe('42.0%');
  });

  test('pct helper treats >1 as already-percent', () => {
    expect(renderTemplate('{{#pct}}{{first.p}}{{/pct}}', [{ p: 87 }])).toBe('87.0%');
  });

  test('date helper formats ISO-like input', () => {
    const out = renderTemplate('{{#date}}{{first.d}}{{/date}}', [{ d: '2026-05-24' }]);
    // exact formatting depends on locale but month abbrev should be present
    expect(out).toMatch(/May/);
  });

  test('date helper passes invalid date through unchanged', () => {
    expect(renderTemplate('{{#date}}not-a-date{{/date}}', [{}])).toBe('not-a-date');
  });

  test('HELPER_NAMES matches MUSTACHE_HELPERS keys', () => {
    expect(new Set(HELPER_NAMES)).toEqual(new Set(Object.keys(MUSTACHE_HELPERS)));
  });
});

describe('renderTemplate — context', () => {
  test('rowCount and first are exposed', () => {
    const out = renderTemplate('count={{rowCount}}, first={{first.name}}', [{ name: 'a' }, { name: 'b' }]);
    expect(out).toBe('count=2, first=a');
  });

  test('rows section iterates', () => {
    const out = renderTemplate('{{#rows}}- {{name}}\n{{/rows}}', [{ name: 'a' }, { name: 'b' }]);
    expect(out).toBe('- a\n- b\n');
  });

  test('table variable emits the sentinel marker', () => {
    const out = renderTemplate('see: {{{table}}}', [{ a: 1 }]);
    expect(out).toContain(TABLE_SENTINEL);
  });

  test('no HTML escaping (terminal output)', () => {
    const out = renderTemplate('{{first.s}}', [{ s: '<b>x</b>' }]);
    expect(out).toBe('<b>x</b>');
  });
});

describe('renderAlignedTable', () => {
  test('renders header + separator + body', () => {
    const out = renderAlignedTable([
      { name: 'a', n: 1 },
      { name: 'b', n: 22 },
    ]);
    const lines = out.split('\n');
    expect(lines).toHaveLength(4); // header, sep, 2 rows
    expect(lines[0]).toContain('name');
    expect(lines[0]).toContain('n');
    expect(lines[1]).toMatch(/─/); // unicode separator
  });

  test('handles empty rows', () => {
    expect(renderAlignedTable([])).toBe('(no rows)');
  });

  test('right-aligns numeric columns', () => {
    const out = renderAlignedTable([
      { label: 'a', n: 1 },
      { label: 'bb', n: 22 },
    ]);
    const rows = out.split('\n').slice(2); // skip header + sep
    // numeric column right-aligned -> the small number gets leading spaces
    expect(rows[0]).toMatch(/ {1}1$/);
    expect(rows[1]).toMatch(/22$/);
  });

  test('handles null cells gracefully', () => {
    const out = renderAlignedTable([{ name: null, n: 1 }]);
    expect(out).not.toMatch(/null/);
  });
});

describe('validateTemplateColumns', () => {
  test('reports unknown column references', () => {
    const missing = validateTemplateColumns('Hello {{name}} from {{city}}', ['name']);
    expect(missing).toEqual(['city']);
  });

  test('helper names are not flagged', () => {
    const missing = validateTemplateColumns('{{#money}}{{rev}}{{/money}}', ['rev']);
    expect(missing).toEqual([]);
  });

  test('top-level context keys (rowCount) are not flagged', () => {
    const missing = validateTemplateColumns('{{rowCount}} rows', []);
    expect(missing).toEqual([]);
  });

  test('dotted refs are passed through as-is (conservative validator)', () => {
    // Current behavior: validator does not split on `.`, so `first.name` is
    // treated as a leaf ref and reported as missing because neither
    // `first.name` nor the literal known set contains it. This is acceptable
    // for now — Mustache will render correctly anyway; the validator only
    // catches the most common typos.
    const missing = validateTemplateColumns('{{first.name}}', ['name']);
    expect(missing).toEqual(['first.name']);
  });

  test('returns empty when template uses only known references', () => {
    const missing = validateTemplateColumns('{{#rows}}- {{label}}\n{{/rows}} ({{rowCount}})', ['label']);
    expect(missing).toEqual([]);
  });
});
