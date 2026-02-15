import { DomainException } from '@qwery/domain/exceptions';

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

export type ApiErrorResponseBody = {
  errorKey: UserFacingErrorKey;
  error: string;
  code?: number;
  data?: unknown;
};

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
    if (
      rule.all?.some((group) => group.every((s) => lower.includes(s)))
    ) {
      return rule.key;
    }
  }
  return null;
}

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
    if (error.code >= 2000 && error.code < 3000) return 'notFound';
    if (error.code === 401 || error.code === 403) return 'permissionDenied';
    if (error.code >= 400 && error.code < 500) return 'generic';
    return 'generic';
  }
  const code =
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';
  if (code === 'PGRST116') return 'notFound';
  if (code === '42501') return 'permissionDenied';

  const msg = getMessage(error);
  const matched = matchMessageRules(msg);
  if (matched) return matched;

  return 'generic';
}
