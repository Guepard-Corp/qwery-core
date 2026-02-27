import type { UserFacingErrorKey } from './keys';

export const DEFAULT_ERROR_MESSAGES: Record<UserFacingErrorKey, string> = {
  permissionDenied: "You don't have permission to do that.",
  notFound: 'That was not found.',
  network: 'Network error. Please try again.',
  generic: 'Something went wrong. Please try again.',
};
