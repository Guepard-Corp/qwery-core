import type { ModelsDevCatalog } from '@qwery/shared/model-cost';

const MODELS_DEV_URL = 'https://models.dev/api.json';

let cached: ModelsDevCatalog | null = null;

/**
 * Load models.dev catalog (cached in memory). Used for cost computation.
 */
export async function getModelsCatalog(): Promise<ModelsDevCatalog> {
  if (cached) return cached;
  const res = await fetch(MODELS_DEV_URL);
  if (!res.ok) throw new Error(`Failed to fetch models catalog: ${res.status}`);
  const json = (await res.json()) as ModelsDevCatalog;
  cached = json;
  return json;
}
