export interface PerformanceConfig {
  // Dataset characteristics
  expectedViewCount: number;
  expectedRowsPerView: number;
  expectedColumnCount: number;

  // Performance targets
  maxSchemaExtractionTime: number; // ms per view
  maxContextUpdateTime: number; // ms per update
  maxVocabularyLookupTime: number; // ms per lookup
  maxMemoryUsage: number; // MB

  // Quality thresholds
  minEntityConfidence: number; // 0.0-1.0
  minRelationshipConfidence: number; // 0.0-1.0
  minVocabularyConfidence: number; // 0.0-1.0

  // Optimization strategy
  optimizationLevel: 'minimal' | 'balanced' | 'aggressive';
  enableBatchProcessing: boolean;
  enableLazyLoading: boolean;
  enableMemoization: boolean;
  enableStreaming: boolean;
  enablePruning: boolean;
  enableDataPatterns: boolean; // Extract data patterns (expensive, optional)
}

const DEFAULT_CONFIGS = {
  small: {
    expectedViewCount: 5,
    expectedRowsPerView: 100,
    expectedColumnCount: 10,
    maxSchemaExtractionTime: 50,
    maxContextUpdateTime: 30,
    maxVocabularyLookupTime: 1,
    maxMemoryUsage: 50,
    minEntityConfidence: 0.6,
    minRelationshipConfidence: 0.5,
    minVocabularyConfidence: 0.7,
    optimizationLevel: 'balanced',
    enableBatchProcessing: true,
    enableLazyLoading: true,
    enableMemoization: true,
    enableStreaming: false,
    enablePruning: true,
    enableDataPatterns: false, // Disabled by default (expensive)
  },
  medium: {
    expectedViewCount: 50,
    expectedRowsPerView: 10000,
    expectedColumnCount: 25,
    maxSchemaExtractionTime: 200,
    maxContextUpdateTime: 100,
    maxVocabularyLookupTime: 2,
    maxMemoryUsage: 200,
    minEntityConfidence: 0.7,
    minRelationshipConfidence: 0.6,
    minVocabularyConfidence: 0.8,
    optimizationLevel: 'aggressive',
    enableBatchProcessing: true,
    enableLazyLoading: true,
    enableMemoization: true,
    enableStreaming: true,
    enablePruning: true,
    enableDataPatterns: false, // Disabled by default (expensive)
  },
  large: {
    expectedViewCount: 200,
    expectedRowsPerView: 100000,
    expectedColumnCount: 50,
    maxSchemaExtractionTime: 500,
    maxContextUpdateTime: 200,
    maxVocabularyLookupTime: 5,
    maxMemoryUsage: 500,
    minEntityConfidence: 0.8,
    minRelationshipConfidence: 0.7,
    minVocabularyConfidence: 0.9,
    optimizationLevel: 'aggressive',
    enableBatchProcessing: true,
    enableLazyLoading: true,
    enableMemoization: true,
    enableStreaming: true,
    enablePruning: true,
    enableDataPatterns: false, // Disabled by default (expensive)
  },
} as const satisfies Record<string, PerformanceConfig>;

// Configuration cache per conversation
const configCache = new Map<string, PerformanceConfig>();

/**
 * Auto-detect configuration based on current state
 */
export function detectConfiguration(
  existingViews: number,
  sampleView?: { rowCount: number; columnCount: number },
): PerformanceConfig {
  const viewCount = existingViews;
  const rowCount = sampleView?.rowCount ?? 100;
  const columnCount = sampleView?.columnCount ?? 10;

  // Determine scale
  let baseConfig: PerformanceConfig;
  if (viewCount <= 10 && rowCount <= 1000) {
    baseConfig = { ...DEFAULT_CONFIGS.small };
  } else if (viewCount <= 100 && rowCount <= 100000) {
    baseConfig = { ...DEFAULT_CONFIGS.medium };
  } else {
    baseConfig = { ...DEFAULT_CONFIGS.large };
  }

  // Adjust based on actual characteristics
  return {
    ...baseConfig,
    expectedViewCount: viewCount,
    expectedRowsPerView: rowCount,
    expectedColumnCount: columnCount,
    // Tighten thresholds if dataset is large
    minEntityConfidence: viewCount > 50 ? 0.8 : baseConfig.minEntityConfidence,
    minRelationshipConfidence:
      viewCount > 50 ? 0.7 : baseConfig.minRelationshipConfidence,
  };
}

/**
 * Get configuration for conversation (with caching)
 */
export async function getConfig(
  conversationDir: string,
): Promise<PerformanceConfig> {
  const cacheKey = conversationDir;

  if (!configCache.has(cacheKey)) {
    // Load view registry to determine scale
    const { loadViewRegistry } = await import('../view-registry');
    const views = await loadViewRegistry({
      conversationDir,
    });
    const config = detectConfiguration(views.length);
    configCache.set(cacheKey, config);
  }

  return configCache.get(cacheKey)!;
}
