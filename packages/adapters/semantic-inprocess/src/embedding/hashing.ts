import type { EmbeddingBackend } from './backend';
import { l2Normalize } from './vector';

/**
 * Zero-dependency, in-process embedding via the hashing trick (Weinberger et
 * al., 2009). Each text is decomposed into features — whole word tokens plus
 * character trigrams — and each feature is hashed (FNV-1a) into a fixed-width
 * vector with a signed bucket update; the result is L2-normalized.
 *
 * No model, no network, no server: fully deterministic and instantaneous. The
 * character trigrams give it morphological reach (e.g. `revenue` ≈ `revenues`)
 * that complements the I-SUB lexical metric, without the weight of a neural
 * embedder. Swap in a richer backend behind {@link EmbeddingBackend} when
 * synonym-level semantics are required.
 */

const DEFAULT_DIMENSIONS = 256;
const NGRAM = 3;

/** FNV-1a 32-bit hash. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Word tokens plus their character trigrams (words ≤ 3 chars contribute as-is). */
function extractFeatures(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const features: string[] = [];
  for (const word of words) {
    features.push(word);
    if (word.length > NGRAM) {
      for (let i = 0; i <= word.length - NGRAM; i++) {
        features.push(word.slice(i, i + NGRAM));
      }
    }
  }
  return features;
}

export interface HashingEmbedderOptions {
  /** Output vector width (default 256). */
  dimensions?: number;
}

export function createHashingEmbedder(options: HashingEmbedderOptions = {}): EmbeddingBackend {
  const dimensions = options.dimensions ?? DEFAULT_DIMENSIONS;

  const embedOne = (text: string): number[] => {
    const vector = new Array<number>(dimensions).fill(0);
    for (const feature of extractFeatures(text)) {
      const hash = fnv1a(feature);
      const index = hash % dimensions;
      const sign = (hash & 1) === 0 ? 1 : -1;
      vector[index] += sign;
    }
    return l2Normalize(vector);
  };

  return {
    dimensions,
    embed: async (texts) => texts.map(embedOne),
  };
}
