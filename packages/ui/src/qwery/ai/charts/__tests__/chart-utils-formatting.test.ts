import { describe, expect, it } from 'vitest';
import { formatAxisTick, formatDateAxisTick } from '../chart-utils';

describe('formatAxisTick', () => {
  it('returns raw localized numbers for small values', () => {
    expect(formatAxisTick(0)).toBe('0');
    expect(formatAxisTick(42)).toBe('42');
    expect(formatAxisTick(-42)).toBe('-42');
  });

  it('formats thousands with K suffix', () => {
    expect(formatAxisTick(1_234)).toBe('1.2K');
    expect(formatAxisTick(12_345)).toBe('12.3K');
  });

  it('formats millions with M suffix', () => {
    expect(formatAxisTick(1_500_000)).toBe('1.5M');
    expect(formatAxisTick(25_000_000)).toBe('25.0M');
  });

  it('formats billions with B suffix', () => {
    expect(formatAxisTick(3_500_000_000)).toBe('3.5B');
  });

  it('supports raw unit to bypass K/M/B scaling', () => {
    expect(formatAxisTick(1_234, 'raw')).toBe('1,234');
  });
});

describe('formatDateAxisTick', () => {
  it('formats Date instances as short month/year', () => {
    const d = new Date('2024-01-15T00:00:00.000Z');
    const formatted = formatDateAxisTick(d);
    expect(formatted).toMatch(/Jan/i);
  });

  it('formats ISO date strings as short month/year', () => {
    const formatted = formatDateAxisTick('2024-03-10');
    expect(formatted).toMatch(/Mar/i);
  });

  it('formats numeric timestamps as short month/year', () => {
    const ts = new Date('2024-06-01T00:00:00.000Z').getTime();
    const formatted = formatDateAxisTick(ts);
    expect(formatted).toMatch(/Jun/i);
  });

  it('returns trimmed string for non-date strings', () => {
    expect(formatDateAxisTick('  foo  ')).toBe('foo');
  });

  it('returns empty string for empty/invalid values', () => {
    expect(formatDateAxisTick('')).toBe('');
    expect(formatDateAxisTick(null)).toBe('');
    expect(formatDateAxisTick(undefined)).toBe('');
  });
});
