export const ERROR_KEYS = {
  permissionDenied: 'common:errors.permissionDenied',
  network: 'common:errors.network',
  notFound: 'common:errors.notFound',
  generic: 'common:errors.generic',
} as const;

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return String(error);
  } catch {
    return '';
  }
}

export function getErrorKey(error: unknown): string {
  const msg = getMessage(error).toLowerCase();

  if (
    msg.includes('row-level security') ||
    (msg.includes('violates') && msg.includes('policy')) ||
    msg.includes('permission denied') ||
    msg.includes('forbidden')
  ) {
    return ERROR_KEYS.permissionDenied;
  }

  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed')
  ) {
    return ERROR_KEYS.network;
  }

  if (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('pgrst116')
  ) {
    return ERROR_KEYS.notFound;
  }

  return ERROR_KEYS.generic;
}

export type TranslateFn = (key: string) => string;

export function toastError(
  error: unknown,
  t: TranslateFn,
  toast: { error: (message: string) => void },
): void {
  toast.error(t(getErrorKey(error)));
}
