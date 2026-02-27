import {
  resolveError,
  ERROR_REGISTRY_OVERRIDES,
  DEFAULT_ERROR_MESSAGES,
  type UserFacingErrorKey,
} from '@qwery/shared/error';
import { getLogger } from '@qwery/shared/logger';

export type ToolErrorShape = {
  details: string;
  status?: number;
};

export function toToolError(error: unknown, status?: number): ToolErrorShape {
  if (typeof error === 'string') {
    return { details: error, status };
  }
  if (error instanceof Error) {
    return {
      details: error.message || error.toString(),
      status,
    };
  }
  try {
    return {
      details: JSON.stringify(error),
      status,
    };
  } catch {
    return {
      details: String(error),
      status,
    };
  }
}

/**
 * Resolves an error to a user-facing key, message, and optional details.
 * Delegates to shared resolution (code/status only). Raw errors with no code
 * resolve to generic unless the host app normalizes them first (e.g. web
 * adapter normalizes backend message patterns before calling getErrorKey).
 * Unmapped codes and category fallbacks are logged for observability.
 */
export function toUserFacingError(
  error: unknown,
  translate?: (key: string, params?: Record<string, unknown>) => string,
): {
  key: UserFacingErrorKey;
  message: string;
  details?: string;
  code?: number;
} {
  const requestId =
    error &&
    typeof error === 'object' &&
    'requestId' in error &&
    typeof (error as { requestId?: unknown }).requestId === 'string'
      ? (error as { requestId: string }).requestId
      : undefined;

  const resolved = resolveError(error, {
    translate,
    defaultMessages: DEFAULT_ERROR_MESSAGES,
    overrides: ERROR_REGISTRY_OVERRIDES,
    onUnmappedCode: (code: number) => {
      void getLogger().then((logger) =>
        logger.warn(
          { code, ...(requestId ? { requestId } : {}) },
          'Error resolution: unmapped code',
        ),
      );
    },
    onFallbackToCategory: (code: number, category: UserFacingErrorKey) => {
      void getLogger().then((logger) =>
        logger.warn(
          { code, category, ...(requestId ? { requestId } : {}) },
          'Error resolution: fallback to category (contract drift risk)',
        ),
      );
    },
  });

  return {
    key: resolved.key,
    message: resolved.message,
    details: resolved.details,
    code: resolved.code,
  };
}
