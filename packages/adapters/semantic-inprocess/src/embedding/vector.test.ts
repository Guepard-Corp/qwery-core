import { describe, expect, test } from 'bun:test';
import { cosineSimilarity, dot, l2Norm, l2Normalize } from './vector';

describe('dot / l2Norm', () => {
  test('dot product', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  test('l2 norm', () => {
    expect(l2Norm([3, 4])).toBe(5);
  });
});

describe('l2Normalize', () => {
  test('normalizes to unit length', () => {
    expect(l2Normalize([3, 4])).toEqual([0.6, 0.8]);
  });

  test('returns zeros for a zero vector', () => {
    expect(l2Normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('cosineSimilarity', () => {
  test('is 1 for parallel vectors', () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1, 12);
  });

  test('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  test('is 0 when either vector has zero norm', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([1, 1], [0, 0])).toBe(0);
  });
});
