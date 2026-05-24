import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_PRESERVE_TAIL_MAX,
  DEFAULT_PRESERVE_TAIL_MIN,
  DEFAULT_RESERVED_OUTPUT,
  isOverflow,
  preserveTailBudget,
  usable,
} from '../overflow';

describe('usable', () => {
  test('zero or unknown context returns 0', () => {
    expect(usable({ contextLimit: 0 })).toBe(0);
    expect(usable({ contextLimit: -1 })).toBe(0);
  });
  test('subtracts reserved default (20k)', () => {
    expect(usable({ contextLimit: 200_000 })).toBe(200_000 - DEFAULT_RESERVED_OUTPUT);
  });
  test('uses maxOutputTokens when present', () => {
    expect(usable({ contextLimit: 100_000, maxOutputTokens: 5_000 })).toBe(95_000);
  });
  test('explicit reserved wins over maxOutputTokens', () => {
    expect(usable({ contextLimit: 100_000, maxOutputTokens: 5_000, reserved: 30_000 })).toBe(70_000);
  });
});

describe('isOverflow', () => {
  test('false for tiny prompts', () => {
    expect(isOverflow({ promptTokens: 1_000, contextLimit: 200_000 })).toBe(false);
  });
  test('true when promptTokens >= usable', () => {
    expect(isOverflow({ promptTokens: 200_000 - DEFAULT_RESERVED_OUTPUT, contextLimit: 200_000 })).toBe(true);
  });
  test('false when contextLimit is unknown', () => {
    expect(isOverflow({ promptTokens: 9_999_999, contextLimit: 0 })).toBe(false);
  });
});

describe('preserveTailBudget', () => {
  test('clamped to min when usable is tiny', () => {
    expect(preserveTailBudget({ contextLimit: 21_000 })).toBe(DEFAULT_PRESERVE_TAIL_MIN);
  });
  test('clamped to max when usable is huge', () => {
    expect(preserveTailBudget({ contextLimit: 1_000_000 })).toBe(DEFAULT_PRESERVE_TAIL_MAX);
  });
  test('respects custom fraction', () => {
    const ctx = 100_000;
    const result = preserveTailBudget({ contextLimit: ctx, fraction: 0.1 });
    const expected = Math.min(
      DEFAULT_PRESERVE_TAIL_MAX,
      Math.max(DEFAULT_PRESERVE_TAIL_MIN, Math.floor((ctx - DEFAULT_RESERVED_OUTPUT) * 0.1)),
    );
    expect(result).toBe(expected);
  });
});
