import type { UserFacingErrorKey } from '@qwery/shared/error';

type MessageRule = {
  key: UserFacingErrorKey;
  any?: string[];
  all?: string[][];
};

const MESSAGE_RULES: readonly MessageRule[] = [
  {
    key: 'permissionDenied',
    any: ['row-level security', 'permission denied', 'forbidden'],
    all: [['violates', 'policy']],
  },
  {
    key: 'network',
    any: [
      'fetch',
      'network',
      'econnreset',
      'etimedout',
      'failed to fetch',
      'load failed',
    ],
  },
  { key: 'notFound', any: ['404', 'not found', 'pgrst116'] },
];

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return String(error);
  } catch {
    return '';
  }
}

function matchMessageRules(msg: string): UserFacingErrorKey | null {
  const lower = msg.toLowerCase();
  for (const rule of MESSAGE_RULES) {
    if (rule.any?.some((s) => lower.includes(s))) return rule.key;
    if (rule.all?.some((group) => group.every((s) => lower.includes(s)))) {
      return rule.key;
    }
  }
  return null;
}

const STATUS_FOR_CATEGORY: Record<UserFacingErrorKey, number> = {
  notFound: 404,
  permissionDenied: 403,
  network: 0,
  generic: 500,
};

/**
 * Normalizes raw errors (e.g. Error with backend message) for shared resolveError.
 * Errors that already have a numeric code or status are returned unchanged so
 * resolveError can use them as-is. Call this before resolveError so logs/error
 * boundaries see the same normalized shape the user sees.
 */
export function normalizeErrorForResolution(error: unknown): unknown {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number'
  ) {
    return error;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    return error;
  }

  const msg = getMessage(error);
  const matched = matchMessageRules(msg);
  if (matched) {
    return { status: STATUS_FOR_CATEGORY[matched] };
  }

  return error;
}
