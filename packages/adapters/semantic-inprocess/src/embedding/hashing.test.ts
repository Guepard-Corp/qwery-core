import { describe, expect, test } from 'bun:test';
import { createHashingEmbedder } from './hashing';
import { cosineSimilarity, l2Norm } from './vector';

const embedder = createHashingEmbedder();
const embed = async (text: string): Promise<number[]> => (await embedder.embed([text]))[0];

describe('createHashingEmbedder', () => {
  test('produces one vector per input of the configured width', async () => {
    const vectors = await embedder.embed(['revenue', 'orders']);
    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toHaveLength(256);
  });

  test('honors a custom dimensionality', async () => {
    const small = createHashingEmbedder({ dimensions: 16 });
    expect(small.dimensions).toBe(16);
    expect((await small.embed(['revenue']))[0]).toHaveLength(16);
  });

  test('returns a zero vector for empty text', async () => {
    expect((await embed('')).every((x) => x === 0)).toBe(true);
  });

  test('is deterministic', async () => {
    expect(await embed('gross revenue')).toEqual(await embed('gross revenue'));
  });

  test('L2-normalizes non-empty vectors', async () => {
    expect(l2Norm(await embed('gross revenue'))).toBeCloseTo(1, 12);
  });

  test('a short word contributes a single feature with no trigrams', async () => {
    const vector = await embed('id');
    expect(vector.filter((x) => x !== 0)).toHaveLength(1);
  });

  test('signed hashing yields both positive and negative buckets', async () => {
    const vector = await embed('revenue gross amount customer orders product inventory');
    expect(vector.some((x) => x > 0)).toBe(true);
    expect(vector.some((x) => x < 0)).toBe(true);
  });

  test('trigrams give morphological reach beyond exact match', async () => {
    const related = cosineSimilarity(await embed('revenue'), await embed('revenues'));
    const unrelated = cosineSimilarity(await embed('revenue'), await embed('elephant'));
    expect(related).toBeGreaterThan(unrelated);
  });
});
