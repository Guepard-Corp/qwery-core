import {
  resolveError,
  ERROR_REGISTRY_OVERRIDES,
  type UserFacingErrorKey,
} from '@qwery/shared/error';

const DEFAULT_MESSAGES: Record<UserFacingErrorKey, string> = {
  permissionDenied: "You don't have permission to do that.",
  notFound: 'That was not found.',
  network: 'Network error. Please try again.',
  generic: 'Something went wrong. Please try again.',
};

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
    defaultMessages: DEFAULT_MESSAGES,
    overrides: ERROR_REGISTRY_OVERRIDES,
  });

  return {
    key: resolved.key,
    message: resolved.message,
    details: resolved.details,
    code: resolved.code,
  };
}
