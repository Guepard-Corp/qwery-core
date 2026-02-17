import {
  resolveError,
  ERROR_REGISTRY_OVERRIDES,
  DEFAULT_ERROR_MESSAGES,
  type UserFacingErrorKey,
} from '@qwery/shared/error';

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
  });

  return {
    key: resolved.key,
    message: resolved.message,
    details: resolved.details,
    code: resolved.code,
  };
}
