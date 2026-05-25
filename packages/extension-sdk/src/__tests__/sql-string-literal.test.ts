import { describe, expect, test } from 'bun:test';
import { escapeSqlIdentifier, escapeSqlStringLiteral } from '../sql-string-literal';

describe('escapeSqlStringLiteral', () => {
  test('doubles every single quote', () => {
    expect(escapeSqlStringLiteral("O'Brien")).toBe("O''Brien");
    expect(escapeSqlStringLiteral("''")).toBe("''''");
  });

  test('leaves a quote-free string untouched', () => {
    expect(escapeSqlStringLiteral('hello world')).toBe('hello world');
  });

  test('handles empty input', () => {
    expect(escapeSqlStringLiteral('')).toBe('');
  });

  test('does not touch double quotes', () => {
    expect(escapeSqlStringLiteral('say "hi"')).toBe('say "hi"');
  });
});

describe('escapeSqlIdentifier', () => {
  test('doubles every double quote', () => {
    expect(escapeSqlIdentifier('My "table"')).toBe('My ""table""');
  });

  test('leaves a quote-free identifier untouched', () => {
    expect(escapeSqlIdentifier('orders')).toBe('orders');
  });

  test('handles empty input', () => {
    expect(escapeSqlIdentifier('')).toBe('');
  });
});
