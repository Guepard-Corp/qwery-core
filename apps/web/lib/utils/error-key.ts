import {
  resolveError,
  initializeTranslationValidation,
  ERROR_REGISTRY_OVERRIDES,
  ERROR_I18N_KEYS,
} from '@qwery/shared/error';
import commonTranslations from '../i18n/locales/en/common.json';

initializeTranslationValidation(commonTranslations);

export const ERROR_KEYS = ERROR_I18N_KEYS;

export function getErrorKey(
  error: unknown,
  t?: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (!t) {
    return ERROR_KEYS.generic;
  }

  const resolved = resolveError(error, {
    translate: t,
    overrides: ERROR_REGISTRY_OVERRIDES,
    translations: commonTranslations,
  });
  return resolved.message;
}

export type TranslateFn = (
  key: string,
  params?: Record<string, unknown>,
) => string;

export function toastError(
  error: unknown,
  t: TranslateFn,
  toast: { error: (message: string) => void },
): void {
  toast.error(getErrorKey(error, t));
}
