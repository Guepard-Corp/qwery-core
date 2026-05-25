import { describe, expect, test } from 'bun:test';
import {
  convertToCsvLink,
  extractGidFromUrl,
  extractGidsFromUrl,
  extractSpreadsheetId,
  resolveFirstCsvUrl,
  sanitizeTableName,
} from '../gsheet';
import { schema } from '../schema';

describe('schema', () => {
  test('accepts a shared link', () => {
    const r = schema.parse({
      sharedLink: 'https://docs.google.com/spreadsheets/d/abc/edit',
    });
    expect(r.sharedLink).toContain('spreadsheets');
  });

  test('rejects non-URLs', () => {
    expect(() => schema.parse({ sharedLink: 'nope' })).toThrow();
  });
});

describe('convertToCsvLink', () => {
  test('strips gid when 0', () => {
    expect(convertToCsvLink('abc', 0)).toBe('https://docs.google.com/spreadsheets/d/abc/export?format=csv');
  });

  test('appends gid otherwise', () => {
    expect(convertToCsvLink('abc', 123)).toContain('&gid=123');
  });
});

describe('extractSpreadsheetId', () => {
  test('pulls the id from a valid URL', () => {
    expect(extractSpreadsheetId('https://docs.google.com/spreadsheets/d/abc_123-XYZ/edit')).toBe(
      'abc_123-XYZ',
    );
  });

  test('returns null for unrelated URLs', () => {
    expect(extractSpreadsheetId('https://example.com')).toBeNull();
  });
});

describe('extractGidFromUrl', () => {
  test('matches ?gid=', () => {
    expect(extractGidFromUrl('https://x?gid=42')).toBe(42);
  });

  test('matches #gid=', () => {
    expect(extractGidFromUrl('https://x#gid=7')).toBe(7);
  });

  test('returns null when absent', () => {
    expect(extractGidFromUrl('https://x')).toBeNull();
  });
});

describe('extractGidsFromUrl', () => {
  test('collects gids from both query and hash', () => {
    expect(extractGidsFromUrl('https://x?gid=1#gid=2')).toEqual([1, 2]);
  });

  test('deduplicates', () => {
    expect(extractGidsFromUrl('https://x?gid=1#gid=1')).toEqual([1]);
  });

  test('returns empty when none found', () => {
    expect(extractGidsFromUrl('https://x')).toEqual([]);
  });
});

describe('sanitizeTableName', () => {
  test('replaces non-word chars with underscore + lowercases', () => {
    expect(sanitizeTableName('Hello World!')).toBe('hello_world_');
  });

  test('prefixes v_ when starting with a digit', () => {
    expect(sanitizeTableName('2024 sales')).toBe('v_2024_sales');
  });
});

describe('resolveFirstCsvUrl', () => {
  test('uses an explicit gid when present', async () => {
    const url = await resolveFirstCsvUrl('https://docs.google.com/spreadsheets/d/abc/edit?gid=99');
    expect(url).toContain('gid=99');
  });

  test('rejects an invalid sheets link', async () => {
    await expect(resolveFirstCsvUrl('https://example.com/x')).rejects.toThrow(/Invalid/);
  });
});
