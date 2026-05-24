/**
 * Embedding capability used by the semantic layer's retrieval. Kept as an
 * adapter-local seam (not a domain port): retrieval depends on it, but the
 * agent never sees it directly. Swapping the implementation — a zero-dependency
 * hashing embedder today, a neural backend later — is a one-line change at the
 * composition root, with no impact on callers.
 */
export interface EmbeddingBackend {
  /** Fixed vector dimensionality every `embed` call produces. */
  readonly dimensions: number;
  /** Embed a batch of texts into L2-normalized vectors of length `dimensions`. */
  embed(texts: string[]): Promise<number[][]>;
}
