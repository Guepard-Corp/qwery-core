import {
  resolveError,
  ERROR_REGISTRY_OVERRIDES,
  DEFAULT_ERROR_MESSAGES,
  type UserFacingErrorKey,
} from '@qwery/shared/error';
import { getLogger } from '@qwery/shared/logger';

function logUnmappedCode(code: number): void {
  void getLogger().then((logger) =>
    logger.warn({ code }, 'Error resolution: unmapped code'),
  );
}

function logFallbackToCategory(
  code: number,
  category: UserFacingErrorKey,
): void {
  void getLogger().then((logger) =>
    logger.warn(
      { code, category },
      'Error resolution: fallback to category (contract drift risk)',
    ),
  );
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
  const resolved = resolveError(error, {
    translate,
    defaultMessages: DEFAULT_ERROR_MESSAGES,
    overrides: ERROR_REGISTRY_OVERRIDES,
    onUnmappedCode: logUnmappedCode,
    onFallbackToCategory: logFallbackToCategory,
  });

  return {
    key: resolved.key,
    message: resolved.message,
    details: resolved.details,
    code: resolved.code,
  };
}
