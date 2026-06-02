import { describe, expect, test } from 'bun:test';
import { defaultLayoutModeFor } from '../agent-layout';

describe('defaultLayoutModeFor', () => {
  test('specialist agents open in the full-screen focus layout', () => {
    expect(defaultLayoutModeFor('db-performance-audit')).toBe('focus');
    expect(defaultLayoutModeFor('slow-query-optimizer')).toBe('focus');
  });

  test('generalist agents express no preference (current layout is kept)', () => {
    expect(defaultLayoutModeFor('data')).toBeUndefined();
    expect(defaultLayoutModeFor('code')).toBeUndefined();
  });

  test('unpinning (null) expresses no preference', () => {
    expect(defaultLayoutModeFor(null)).toBeUndefined();
  });
});
