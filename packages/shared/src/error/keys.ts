import { DomainException } from '@qwery/domain/exceptions';
import { getErrorCategory, getErrorCategoryFromStatus } from './codes';

export type UserFacingErrorKey =
  | 'permissionDenied'
  | 'notFound'
  | 'network'
  | 'generic';

export const USER_FACING_ERROR_KEYS: readonly UserFacingErrorKey[] = [
  'permissionDenied',
  'notFound',
  'network',
  'generic',
] as const;

export const SAFE_ERROR_MESSAGE = 'Something went wrong';

export const ERROR_I18N_KEYS: Record<UserFacingErrorKey, string> = {
  permissionDenied: 'common:errors.permissionDenied',
  network: 'common:errors.network',
  notFound: 'common:errors.notFound',
  generic: 'common:errors.generic',
} as const;

export type ApiErrorResponseBody = {
  code: number;
  params?: unknown;
  details?: string;
  requestId?: string;
};

export function isUserFacingErrorKey(
  value: unknown,
): value is UserFacingErrorKey {
  return (
    typeof value === 'string' &&
    USER_FACING_ERROR_KEYS.includes(value as UserFacingErrorKey)
  );
}

export function getErrorKeyFromError(error: unknown): UserFacingErrorKey {
  if (error instanceof DomainException) {
    return getErrorCategory(error.code);
  }

  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number'
  ) {
    return getErrorCategory((error as { code: number }).code);
  }

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: number }).status === 'number'
  ) {
    return getErrorCategoryFromStatus((error as { status: number }).status);
  }

  return 'generic';
}
