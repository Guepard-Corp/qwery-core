import { describe, it, expect } from 'vitest';
import {
  isBrowser,
  formatCurrency,
  cleanSql,
  sortByModifiedDesc,
  sortByModifiedAsc,
  sortByDateDesc,
  type WithModifiedDate,
} from '../src/utils';

describe('utils', () => {
  describe('isBrowser', () => {
    it('returns false in node', () => {
      expect(isBrowser()).toBe(false);
    });

    it('returns true when window is defined', () => {
      const g = globalThis as { window?: unknown };
      const orig = g.window;
      g.window = {};
      try {
        expect(isBrowser()).toBe(true);
      } finally {
        if (orig === undefined) {
          delete g.window;
        } else {
          g.window = orig;
        }
      }
    });
  });

  describe('formatCurrency', () => {
    it('formats value with locale and currency', () => {
      const result = formatCurrency({
        currencyCode: 'USD',
        locale: 'en-US',
        value: 1234.56,
      });
      expect(result).toMatch(/\$1[,.]?234[,.]?56/);
    });

    it('accepts string value', () => {
      const result = formatCurrency({
        currencyCode: 'EUR',
        locale: 'de-DE',
        value: '99.99',
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('uses region from locale when present', () => {
      const result = formatCurrency({
        currencyCode: 'GBP',
        locale: 'en-GB',
        value: 100,
      });
      expect(result).toContain('100');
    });
  });

  describe('cleanSql', () => {
    it('returns empty string for null or undefined', () => {
      expect(cleanSql(null)).toBe('');
      expect(cleanSql(undefined)).toBe('');
    });

    it('returns empty string for non-string', () => {
      expect(cleanSql(0 as unknown as string)).toBe('');
    });

    it('replaces escape sequences', () => {
      expect(cleanSql('select *\\nfrom t', { format: false })).toBe(
        'select *\nfrom t',
      );
      expect(cleanSql('a\\tb', { format: false })).toBe('a\tb');
    });

    it('strips surrounding quotes', () => {
      expect(cleanSql('"select 1"', { format: false })).toBe('select 1');
      expect(cleanSql("'select 1'", { format: false })).toBe('select 1');
    });

    it('strips trailing }}', () => {
      expect(cleanSql('select 1}}', { format: false })).toBe('select 1');
    });

    it('trims whitespace', () => {
      expect(cleanSql('  select 1  ', { format: false })).toBe('select 1');
    });

    it('formats SQL when format is not false', () => {
      const result = cleanSql('select * from t');
      expect(result).toContain('SELECT');
      expect(result).toContain('FROM');
    });

    it('skips formatting when options.format is false', () => {
      const result = cleanSql('select * from t', { format: false });
      expect(result).toBe('select * from t');
    });

    it('returns cleaned string when formatter throws', () => {
      const result = cleanSql('invalid {{ sql', { format: true });
      expect(result).toBe('invalid {{ sql');
    });

    it('uses language option for formatter', () => {
      const result = cleanSql('select 1', { language: 'postgresql' });
      expect(result).toContain('SELECT');
    });
  });

  describe('sortByModifiedDesc', () => {
    it('sorts by updatedAt descending', () => {
      const items: WithModifiedDate[] = [
        {
          updatedAt: new Date('2024-01-01'),
          createdAt: new Date('2023-01-01'),
        },
        {
          updatedAt: new Date('2024-03-01'),
          createdAt: new Date('2023-01-01'),
        },
        {
          updatedAt: new Date('2024-02-01'),
          createdAt: new Date('2023-01-01'),
        },
      ];
      const sorted = sortByModifiedDesc(items);
      expect(sorted[0].updatedAt).toEqual(new Date('2024-03-01'));
      expect(sorted[2].updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('falls back to createdAt when updatedAt missing', () => {
      const items: WithModifiedDate[] = [
        { createdAt: new Date('2024-02-01') },
        { createdAt: new Date('2024-01-01') },
      ];
      const sorted = sortByModifiedDesc(items);
      expect(sorted[0].createdAt).toEqual(new Date('2024-02-01'));
    });

    it('does not mutate original array', () => {
      const items: WithModifiedDate[] = [
        { updatedAt: new Date('2024-02-01') },
        { updatedAt: new Date('2024-01-01') },
      ];
      const copy = [...items];
      sortByModifiedDesc(items);
      expect(items).toEqual(copy);
    });

    it('treats missing dates as epoch', () => {
      const items: WithModifiedDate[] = [
        {},
        { updatedAt: new Date('2024-01-01') },
      ];
      const sorted = sortByModifiedDesc(items);
      expect(sorted[0].updatedAt).toEqual(new Date('2024-01-01'));
    });
  });

  describe('sortByModifiedAsc', () => {
    it('sorts by updatedAt ascending', () => {
      const items: WithModifiedDate[] = [
        { updatedAt: new Date('2024-03-01') },
        { updatedAt: new Date('2024-01-01') },
        { updatedAt: new Date('2024-02-01') },
      ];
      const sorted = sortByModifiedAsc(items);
      expect(sorted[0].updatedAt).toEqual(new Date('2024-01-01'));
      expect(sorted[2].updatedAt).toEqual(new Date('2024-03-01'));
    });

    it('does not mutate original array', () => {
      const items: WithModifiedDate[] = [
        { updatedAt: new Date('2024-02-01') },
        { updatedAt: new Date('2024-01-01') },
      ];
      const copy = [...items];
      sortByModifiedAsc(items);
      expect(items).toEqual(copy);
    });
  });

  describe('sortByDateDesc', () => {
    it('sorts by getter date descending', () => {
      const items = [
        { name: 'a', date: new Date('2024-01-01') },
        { name: 'b', date: new Date('2024-03-01') },
        { name: 'c', date: new Date('2024-02-01') },
      ];
      const sorted = sortByDateDesc(items, (x) => x.date);
      expect(sorted.map((x) => x.name)).toEqual(['b', 'c', 'a']);
    });

    it('treats undefined date as epoch', () => {
      const items = [
        { name: 'a', date: undefined },
        { name: 'b', date: new Date('2024-01-01') },
      ];
      const sorted = sortByDateDesc(items, (x) => x.date);
      expect(sorted[0].name).toBe('b');
    });

    it('does not mutate original array', () => {
      const items = [
        { date: new Date('2024-02-01') },
        { date: new Date('2024-01-01') },
      ];
      const copy = items.map((x) => ({ ...x }));
      sortByDateDesc(items, (x) => x.date);
      expect(items).toEqual(copy);
    });
  });
});
