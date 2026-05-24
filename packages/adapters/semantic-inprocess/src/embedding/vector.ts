/** Dense-vector helpers for embedding similarity. Callers guarantee equal lengths. */

/** Dot product of two equal-length vectors. */
export function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/** Euclidean (L2) norm. */
export function l2Norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

/** L2-normalize a vector. A zero vector is returned unchanged (as zeros). */
export function l2Normalize(a: number[]): number[] {
  const norm = l2Norm(a);
  if (norm === 0) {
    return a.map(() => 0);
  }
  return a.map((x) => x / norm);
}

/** Cosine similarity in [-1, 1]; 0 when either vector has zero norm. */
export function cosineSimilarity(a: number[], b: number[]): number {
  const normA = l2Norm(a);
  const normB = l2Norm(b);
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot(a, b) / (normA * normB);
}
