import type { ModelsDevCatalog } from '../utils/model-cost';

/**
 * Provides the `models.dev`-shaped pricing catalog used for cost computation.
 * Backed by an HTTP fetch in production; in tests, a static catalog is injected.
 */
export interface IModelCatalog {
  getCatalog(): Promise<ModelsDevCatalog>;
}
