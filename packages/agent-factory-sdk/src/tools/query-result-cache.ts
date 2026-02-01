/**
 * Query Result Cache
 * Stores full query results in memory to avoid injecting them into agent context
 * Tools can access full results via query ID
 */
import { getLogger } from '@qwery/shared/logger';

export interface QueryResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  query: string;
  timestamp: number;
}

/**
 * Per-conversation query result cache
 * conversationId -> queryId -> QueryResult
 */
const queryResultCache = new Map<string, Map<string, QueryResult>>();

/**
 * Generate a unique query ID from the query string
 */
function generateQueryId(query: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `query_${Math.abs(hash).toString(36)}_${Date.now()}`;
}

/**
 * Get or create cache for a conversation
 */
function getCache(conversationId: string): Map<string, QueryResult> {
  if (!queryResultCache.has(conversationId)) {
    queryResultCache.set(conversationId, new Map());
  }
  return queryResultCache.get(conversationId)!;
}

/**
 * Store query result in cache
 */
export function storeQueryResult(
  conversationId: string,
  query: string,
  columns: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const cache = getCache(conversationId);
  const queryId = generateQueryId(query);

  cache.set(queryId, {
    columns,
    rows,
    query,
    timestamp: Date.now(),
  });

  getLogger().then((l) =>
    l.debug(
      `[QueryResultCache] Stored query result: ${queryId} (${rows.length} rows)`,
    ),
  );

  return queryId;
}

/**
 * Get full query result from cache
 */
export function getQueryResult(
  conversationId: string,
  queryId: string,
): QueryResult | null {
  const cache = getCache(conversationId);
  const result = cache.get(queryId);

  if (result) {
    getLogger().then((l) =>
      l.debug(
        `[QueryResultCache] Retrieved query result: ${queryId} (${result.rows.length} rows)`,
      ),
    );
  } else {
    getLogger().then((l) =>
      l.warn(`[QueryResultCache] Query result not found: ${queryId}`),
    );
  }

  return result || null;
}

/**
 * Clear cache for a conversation
 */
export function clearQueryResultCache(conversationId: string): void {
  queryResultCache.delete(conversationId);
  getLogger().then((l) =>
    l.debug(
      `[QueryResultCache] Cleared cache for conversation: ${conversationId}`,
    ),
  );
}

/**
 * Cleanup old entries (older than 1 hour)
 */
export function cleanupOldResults(conversationId: string): void {
  const cache = getCache(conversationId);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let cleaned = 0;

  for (const [queryId, result] of cache.entries()) {
    if (result.timestamp < oneHourAgo) {
      cache.delete(queryId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    getLogger().then((l) =>
      l.debug(
        `[QueryResultCache] Cleaned up ${cleaned} old query result(s) for conversation: ${conversationId}`,
      ),
    );
  }
}
