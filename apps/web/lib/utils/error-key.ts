import type { UserFacingErrorKey } from '@qwery/shared/error-keys';
import {
  getErrorKeyFromError,
  isUserFacingErrorKey,
} from '@qwery/shared/error-keys';

export const ERROR_KEYS = {
  permissionDenied: 'common:errors.permissionDenied',
  network: 'common:errors.network',
  notFound: 'common:errors.notFound',
  generic: 'common:errors.generic',
} as const;

const ERROR_KEY_BY_USER_KEY: Record<UserFacingErrorKey, string> = {
  permissionDenied: ERROR_KEYS.permissionDenied,
  notFound: ERROR_KEYS.notFound,
  network: ERROR_KEYS.network,
  generic: ERROR_KEYS.generic,
};

export function getErrorKey(error: unknown): string {
  if (error && typeof error === 'object' && 'errorKey' in error) {
    const key = (error as { errorKey: unknown }).errorKey;
    if (isUserFacingErrorKey(key)) {
      return ERROR_KEY_BY_USER_KEY[key];
    }
  }

  const status =
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: number }).status === 'number'
      ? (error as { status: number }).status
      : undefined;
  if (status !== undefined) {
    if (status === 401 || status === 403) return ERROR_KEYS.permissionDenied;
    if (status === 404) return ERROR_KEYS.notFound;
    if (status === 502 || status === 503 || status === 504 || status === 0) {
      return ERROR_KEYS.network;
    }
  }

  const userKey = getErrorKeyFromError(error);
  return ERROR_KEY_BY_USER_KEY[userKey];
}

export type TranslateFn = (key: string) => string;

export function toastError(
  error: unknown,
  t: TranslateFn,
  toast: { error: (message: string) => void },
): void {
  toast.error(t(getErrorKey(error)));
}
