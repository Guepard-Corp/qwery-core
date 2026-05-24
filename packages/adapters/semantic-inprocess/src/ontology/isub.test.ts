import { describe, expect, test } from 'bun:test';
import { isub, longestCommonSubstring } from './isub';

describe('longestCommonSubstring', () => {
  test('finds the longest shared run', () => {
    expect(longestCommonSubstring('hello', 'yellow')).toBe('ello');
  });

  test('returns empty when the first string is empty', () => {
    expect(longestCommonSubstring('', 'x')).toBe('');
  });

  test('returns empty when the second string is empty', () => {
    expect(longestCommonSubstring('x', '')).toBe('');
  });

  test('returns empty when there is no shared character', () => {
    expect(longestCommonSubstring('abc', 'xyz')).toBe('');
  });
});

describe('isub', () => {
  test('is case-insensitive and returns 1 for equal strings', () => {
    expect(isub('Revenue', 'revenue')).toBe(1);
  });

  test('returns 0 when the first string is empty', () => {
    expect(isub('', 'revenue')).toBe(0);
  });

  test('returns 0 when the second string is empty', () => {
    expect(isub('revenue', '')).toBe(0);
  });

  test('returns 0 when no substring reaches the minimum length', () => {
    expect(isub('abc', 'xyz')).toBe(0);
  });

  test('scores a substring overlap between 0 and 1', () => {
    expect(isub('revenue', 'gross_revenue_usd')).toBeCloseTo(0.583, 3);
  });

  test('accumulates multiple disjoint common substrings', () => {
    expect(isub('abcxyz', 'abcqqxyz')).toBeCloseTo(0.857, 3);
  });

  test('honors a custom minimum-substring threshold', () => {
    // With minSubstr=2, the 2-char overlap "id" now counts.
    expect(isub('id', 'idx', 2)).toBeGreaterThan(0);
  });
});
