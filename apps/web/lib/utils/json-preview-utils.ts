/**
 * JSON Preview Utilities
 *
 * Constants and utility functions for JSON preview handling
 * with guardrails to prevent browser overload
 */

export const JSON_PREVIEW_CONFIG = {
  MAX_JSON_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DEPTH: 20,
  MAX_ITEMS_TO_RENDER: 100,
  MAX_STRING_LENGTH: 500,
} as const;

export interface JsonFetchResult {
  data: unknown;
  error: string | null;
}

/**
 * Fetches and validates JSON data from a URL
 */
export async function fetchJsonData(url: string): Promise<JsonFetchResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Failed to fetch JSON: ${response.status} ${response.statusText}`,
      };
    }

    const contentLength = response.headers.get('content-length');
    if (
      contentLength &&
      parseInt(contentLength, 10) > JSON_PREVIEW_CONFIG.MAX_JSON_SIZE
    ) {
      return {
        data: null,
        error: `JSON file too large (${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB). Maximum size is ${JSON_PREVIEW_CONFIG.MAX_JSON_SIZE / 1024 / 1024}MB.`,
      };
    }

    const text = await response.text();
    if (text.length > JSON_PREVIEW_CONFIG.MAX_JSON_SIZE) {
      return {
        data: null,
        error: `JSON file too large (${Math.round(text.length / 1024 / 1024)}MB). Maximum size is ${JSON_PREVIEW_CONFIG.MAX_JSON_SIZE / 1024 / 1024}MB.`,
      };
    }

    try {
      const parsed = JSON.parse(text);
      return { data: parsed, error: null };
    } catch (parseError) {
      return {
        data: null,
        error: `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
      };
    }
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : 'Failed to load JSON data',
    };
  }
}

/**
 * Formats JSON size for display
 */
export function formatJsonSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
