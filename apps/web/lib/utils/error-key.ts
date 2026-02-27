import {
  resolveError,
  initializeTranslationValidation,
  ERROR_REGISTRY_OVERRIDES,
  ERROR_I18N_KEYS,
  DEFAULT_ERROR_MESSAGES,
  type UserFacingErrorKey,
} from '@qwery/shared/error';
import { getLogger } from '@qwery/shared/logger';
import { ZodError } from 'zod';
import commonTranslations from '../i18n/locales/en/common.json';
import { normalizeErrorForResolution } from '../error-adapter';

let initialized = false;

export function initializeErrorHandling(): void {
  if (!initialized) {
    initializeTranslationValidation(commonTranslations);
    initialized = true;
  }
}

initializeErrorHandling();

export const ERROR_KEYS = ERROR_I18N_KEYS;

function formatZodErrorMessage(error: ZodError): string {
  const first = error.issues?.[0];
  return first?.message ?? '';
}

/** First validation message from a ZodError. Use for Channel 1 (validation) toasts; do not send ZodErrors into getErrorKey. */
export function getFirstZodValidationMessage(error: ZodError): string {
  return formatZodErrorMessage(error);
}

export function getErrorKey(
  error: unknown,
  t?: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (!t) {
    return ERROR_KEYS.generic;
  }

  if (error instanceof ZodError) {
    const msg = formatZodErrorMessage(error);
    return msg.trim() ? msg : t(ERROR_KEYS.generic);
  }

  const normalized = normalizeErrorForResolution(error);
  const requestId =
    normalized &&
    typeof normalized === 'object' &&
    'requestId' in normalized &&
    typeof (normalized as { requestId?: unknown }).requestId === 'string'
      ? (normalized as { requestId: string }).requestId
      : undefined;

  const resolved = resolveError(normalized, {
    translate: t,
    defaultMessages: DEFAULT_ERROR_MESSAGES,
    overrides: ERROR_REGISTRY_OVERRIDES,
    translations: commonTranslations,
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
  return resolved.message;
}
