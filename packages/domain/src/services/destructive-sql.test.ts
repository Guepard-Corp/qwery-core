import { describe, expect, test } from 'bun:test';
import { classifyDestructiveSql } from './destructive-sql';

describe('classifyDestructiveSql — destructive operations', () => {
  test('DROP TABLE is destructive', () => {
    const r = classifyDestructiveSql('DROP TABLE users');
    expect(r.destructive).toBe(true);
    expect(r.statements[0].operation).toBe('DROP');
    expect(r.reasons).toHaveLength(1);
  });

  test('TRUNCATE is destructive', () => {
    expect(classifyDestructiveSql('TRUNCATE TABLE orders').destructive).toBe(true);
  });

  test('DELETE without WHERE is destructive', () => {
    const r = classifyDestructiveSql('DELETE FROM users');
    expect(r.destructive).toBe(true);
    expect(r.statements[0].scoped).toBe(false);
  });

  test('DELETE with WHERE is still destructive but marked scoped', () => {
    const r = classifyDestructiveSql('DELETE FROM users WHERE id = 1');
    expect(r.destructive).toBe(true);
    expect(r.statements[0].scoped).toBe(true);
  });

  test('UPDATE without WHERE is destructive', () => {
    const r = classifyDestructiveSql('UPDATE users SET active = false');
    expect(r.destructive).toBe(true);
    expect(r.statements[0].operation).toBe('UPDATE');
  });

  test('ALTER is destructive (schema change)', () => {
    expect(classifyDestructiveSql('ALTER TABLE users ADD COLUMN age INT').destructive).toBe(true);
  });

  test('RENAME is destructive (schema change)', () => {
    expect(classifyDestructiveSql('RENAME TABLE a TO b').destructive).toBe(true);
  });

  test('case-insensitive matching', () => {
    expect(classifyDestructiveSql('dRoP tAbLe users').destructive).toBe(true);
  });

  test('leading whitespace and newlines', () => {
    expect(classifyDestructiveSql('\n\t   DELETE FROM t').destructive).toBe(true);
  });
});

describe('classifyDestructiveSql — non-destructive operations', () => {
  test('SELECT is safe', () => {
    const r = classifyDestructiveSql('SELECT * FROM users');
    expect(r.destructive).toBe(false);
    expect(r.statements[0].operation).toBe('SELECT');
    expect(r.reasons).toHaveLength(0);
  });

  test('UPDATE with WHERE is safe', () => {
    const r = classifyDestructiveSql('UPDATE users SET active = false WHERE id = 1');
    expect(r.destructive).toBe(false);
    expect(r.statements[0].scoped).toBe(true);
  });

  test('INSERT is safe', () => {
    expect(classifyDestructiveSql('INSERT INTO t (a) VALUES (1)').destructive).toBe(false);
  });

  test('CREATE is safe (additive)', () => {
    expect(classifyDestructiveSql('CREATE TABLE t (id INT)').destructive).toBe(false);
  });

  test('unknown command is OTHER and safe', () => {
    const r = classifyDestructiveSql('EXPLAIN ANALYZE SELECT 1');
    expect(r.statements[0].operation).toBe('OTHER');
    expect(r.destructive).toBe(false);
  });

  test('empty input yields no statements', () => {
    const r = classifyDestructiveSql('   ');
    expect(r.destructive).toBe(false);
    expect(r.statements).toHaveLength(0);
  });
});

describe('classifyDestructiveSql — false positives (keywords not in command position)', () => {
  test('keyword inside a string literal does not trigger', () => {
    const r = classifyDestructiveSql("SELECT 'DROP TABLE users' AS note");
    expect(r.destructive).toBe(false);
    expect(r.statements[0].operation).toBe('SELECT');
  });

  test('keyword inside a line comment does not trigger', () => {
    const r = classifyDestructiveSql('-- DROP TABLE users\nSELECT 1');
    expect(r.destructive).toBe(false);
  });

  test('keyword inside a block comment does not trigger', () => {
    const r = classifyDestructiveSql('/* TRUNCATE everything */ SELECT 1');
    expect(r.destructive).toBe(false);
  });

  test('keyword inside a quoted identifier does not trigger', () => {
    const r = classifyDestructiveSql('SELECT "drop" FROM t');
    expect(r.destructive).toBe(false);
  });

  test('keyword inside a dollar-quoted body does not trigger', () => {
    const r = classifyDestructiveSql('SELECT $$ DROP TABLE x $$ AS body');
    expect(r.destructive).toBe(false);
  });

  test('escaped single quotes inside a literal are handled', () => {
    const r = classifyDestructiveSql("SELECT 'it''s a DROP joke' AS note");
    expect(r.destructive).toBe(false);
  });

  test('semicolon inside a string literal is not a statement boundary', () => {
    const r = classifyDestructiveSql("SELECT 'a;DROP TABLE x' AS note");
    expect(r.destructive).toBe(false);
    expect(r.statements).toHaveLength(1);
  });
});

describe('classifyDestructiveSql — multi-statement and CTE', () => {
  test('a destructive statement anywhere flags the batch', () => {
    const r = classifyDestructiveSql('SELECT 1; DROP TABLE users; SELECT 2');
    expect(r.destructive).toBe(true);
    expect(r.statements).toHaveLength(3);
    expect(r.reasons).toHaveLength(1);
  });

  test('aggregates reasons across multiple destructive statements', () => {
    const r = classifyDestructiveSql('DELETE FROM a; DROP TABLE b');
    expect(r.reasons).toHaveLength(2);
  });

  test('trailing semicolon does not create an empty statement', () => {
    const r = classifyDestructiveSql('SELECT 1;');
    expect(r.statements).toHaveLength(1);
  });

  test('data-modifying CTE (WITH … DELETE) is detected', () => {
    const r = classifyDestructiveSql(
      'WITH old AS (SELECT id FROM t) DELETE FROM t WHERE id IN (SELECT id FROM old)',
    );
    expect(r.destructive).toBe(true);
    expect(r.statements[0].operation).toBe('DELETE');
  });

  test('read-only CTE is safe', () => {
    const r = classifyDestructiveSql('WITH x AS (SELECT 1) SELECT * FROM x');
    expect(r.destructive).toBe(false);
    expect(r.statements[0].operation).toBe('SELECT');
  });
});

describe('classifyDestructiveSql — best-effort limitation (documented)', () => {
  // Known false negative: a WHERE living only in a subquery makes an
  // otherwise-unscoped UPDATE look scoped. Accepted under ADR #11 best-effort
  // detection; documented here so the behavior is intentional, not a surprise.
  test('UPDATE whose only WHERE is in a subquery is treated as scoped', () => {
    const r = classifyDestructiveSql('UPDATE t SET x = (SELECT max(y) FROM z WHERE z.k = 1)');
    expect(r.statements[0].destructive).toBe(false);
  });
});
