import {
  ERROR_CODES,
  getErrorCategory,
  getErrorCategoryFromStatus,
} from './codes';
import type { UserFacingErrorKey } from './keys';
import { ERROR_REGISTRY_OVERRIDES } from './overrides';

const CODE_TO_PROPERTY_NAME = new Map<number, string>();
for (const [key, code] of Object.entries(ERROR_CODES)) {
  if (typeof code === 'number') {
    CODE_TO_PROPERTY_NAME.set(code, key);
  }
}

function toCamelCase(str: string): string {
  return str
    .split('_')
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

function transformPropertyNameToI18nKey(propertyName: string): string {
  let name = propertyName;
  const hadErrorSuffix = name.endsWith('_ERROR');

  if (hadErrorSuffix) {
    name = name.slice(0, -6);
  }

  const parts = name.split('_');

  if (parts.length === 1) {
    const base = toCamelCase(name);
    return hadErrorSuffix
      ? `common:errors.${base}Error`
      : `common:errors.${base}`;
  }

  const firstPart = parts[0]!;
  const remainingParts = parts.slice(1);

  const simpleFlatErrors = ['BAD', 'WRONG', 'ENTITY', 'USE', 'VALUE'];

  if (
    parts.length === 2 &&
    simpleFlatErrors.includes(firstPart) &&
    !remainingParts.some((p) => p === 'NOT' || p === 'ALREADY')
  ) {
    const fullName = hadErrorSuffix ? `${name}_ERROR` : name;
    return `common:errors.${toCamelCase(fullName)}`;
  }

  if (
    firstPart === 'USE' &&
    remainingParts.length >= 2 &&
    remainingParts[0] === 'CASE'
  ) {
    const fullName = hadErrorSuffix ? `${name}_ERROR` : name;
    return `common:errors.${toCamelCase(fullName)}`;
  }

  if (
    remainingParts.length === 2 &&
    remainingParts[0] === 'NOT' &&
    remainingParts[1] === 'FOUND'
  ) {
    const entity = toCamelCase(firstPart);
    return `common:errors.${entity}.notFound`;
  }

  if (
    remainingParts.length === 2 &&
    remainingParts[0] === 'ALREADY' &&
    remainingParts[1] === 'EXISTS'
  ) {
    const entity = toCamelCase(firstPart);
    return `common:errors.${entity}.alreadyExists`;
  }

  if (
    firstPart === 'AGENT' &&
    remainingParts.length >= 3 &&
    remainingParts[0] === 'SESSION' &&
    remainingParts[1] === 'NOT' &&
    remainingParts[2] === 'FOUND'
  ) {
    return `common:errors.agent.sessionNotFound`;
  }

  if (
    firstPart === 'STATE' &&
    remainingParts.length >= 3 &&
    remainingParts[0] === 'MACHINE' &&
    remainingParts[1] === 'NOT' &&
    remainingParts[2] === 'FOUND'
  ) {
    return `common:errors.agent.stateMachineNotFound`;
  }

  if (
    firstPart === 'INVALID' &&
    remainingParts.length === 2 &&
    remainingParts[0] === 'STATE' &&
    remainingParts[1] === 'TRANSITION'
  ) {
    return `common:errors.agent.invalidStateTransition`;
  }

  if (
    firstPart === 'AGENT' &&
    remainingParts.length >= 2 &&
    remainingParts[remainingParts.length - 2] === 'NOT' &&
    remainingParts[remainingParts.length - 1] === 'FOUND'
  ) {
    const actionParts = remainingParts.slice(0, -2);
    const action = toCamelCase(actionParts.join('_'));
    return `common:errors.agent.${action}NotFound`;
  }

  if (firstPart === 'AGENT' && remainingParts.length > 0) {
    const action = toCamelCase(remainingParts.join('_'));
    return `common:errors.agent.${action}`;
  }

  if (parts.length >= 2 && firstPart) {
    const entity = toCamelCase(firstPart);
    const action = toCamelCase(remainingParts.join('_'));
    return hadErrorSuffix
      ? `common:errors.${entity}.${action}Error`
      : `common:errors.${entity}.${action}`;
  }

  const base = toCamelCase(name);
  return hadErrorSuffix
    ? `common:errors.${base}Error`
    : `common:errors.${base}`;
}

const i18nKeyCache = new Map<number, string>();

let translationKeySet: Set<string> | null = null;
const isDevelopment =
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'development';

function buildTranslationKeySet(
  obj: Record<string, unknown>,
  prefix = '',
): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const nestedKeys = buildTranslationKeySet(
        value as Record<string, unknown>,
        fullKey,
      );
      nestedKeys.forEach((k) => keys.add(k));
    }
    keys.add(fullKey);
  }
  return keys;
}

export function initializeTranslationValidation(
  translations: Record<string, unknown>,
): void {
  translationKeySet = buildTranslationKeySet(translations);
}

function validateI18nKey(i18nKey: string): boolean {
  if (!translationKeySet) {
    return true;
  }

  const [namespace, ...pathParts] = i18nKey.split(':');
  if (namespace !== 'common') {
    return true;
  }

  const path = pathParts.join(':');
  return translationKeySet.has(path);
}

function logMissingKey(i18nKey: string, code: number): void {
  if (!isDevelopment) {
    return;
  }

  const logLevel = 'warn';
  console[logLevel](
    `[Error Registry] Generated i18n key "${i18nKey}" does not exist in translation files. ` +
      `Error code: ${code}. Falling back to category-based message.`,
  );
}

export interface ErrorResolutionOptions {
  overrides?: Record<number, string>;
  validateKey?: (key: string) => boolean;
  onValidationFailure?: (key: string, code: number) => void;
  translations?: Record<string, unknown>;
}

export function getI18nKeyForErrorCode(
  code: number,
  options: ErrorResolutionOptions = {},
): string | undefined {
  const {
    overrides,
    validateKey,
    onValidationFailure,
    translations,
  } = options;

  if (translations && !translationKeySet) {
    initializeTranslationValidation(translations);
  }

  if (overrides?.[code]) {
    return overrides[code];
  }

  const cached = i18nKeyCache.get(code);
  if (cached !== undefined) {
    return cached;
  }

  const propertyName = CODE_TO_PROPERTY_NAME.get(code);
  if (!propertyName) {
    if (isDevelopment) {
      console.warn(
        `[Error Registry] No property name found for code ${code}`,
      );
    }
    return undefined;
  }

  const i18nKey = transformPropertyNameToI18nKey(propertyName);
  if (!i18nKey) {
    if (isDevelopment) {
      console.warn(
        `[Error Registry] Failed to transform ${propertyName} (code ${code})`,
      );
    }
    return undefined;
  }

  const shouldValidate =
    validateKey !== undefined || translationKeySet !== null;
  const isValid = shouldValidate
    ? validateKey
      ? validateKey(i18nKey)
      : validateI18nKey(i18nKey)
    : true;

  if (!isValid) {
    if (onValidationFailure) {
      onValidationFailure(i18nKey, code);
    } else {
      logMissingKey(i18nKey, code);
    }
  }

  i18nKeyCache.set(code, i18nKey);
  return i18nKey;
}

export interface ResolveErrorOptions extends ErrorResolutionOptions {
  translate?: (key: string, params?: Record<string, unknown>) => string;
  defaultMessages?: Record<UserFacingErrorKey, string>;
}

export function resolveError(
  error: unknown,
  options: ResolveErrorOptions = {},
): {
  key: UserFacingErrorKey;
  message: string;
  i18nKey?: string;
  details?: string;
  code?: number;
} {
  const { translate, defaultMessages, ...resolutionOptions } = options;

  function getErrorCode(err: unknown): number | undefined {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: unknown }).code;
      if (typeof code === 'number') return code;
    }
    return undefined;
  }

  function getDetails(err: unknown): string | undefined {
    if (err && typeof err === 'object' && 'details' in err) {
      const details = (err as { details?: unknown }).details;
      if (typeof details === 'string') {
        return details;
      }
    }
    return undefined;
  }

  function getParams(err: unknown): Record<string, unknown> | undefined {
    if (err && typeof err === 'object' && 'params' in err) {
      const params = (err as { params?: unknown }).params;
      if (params && typeof params === 'object' && !Array.isArray(params)) {
        return params as Record<string, unknown>;
      }
    }
    return undefined;
  }

  const code = getErrorCode(error);
  const details = getDetails(error);
  const params = getParams(error);

  if (code !== undefined) {
    const i18nKey = getI18nKeyForErrorCode(code, {
      ...resolutionOptions,
      translations: options.translations,
    });
    if (i18nKey && translate) {
      const translated = translate(i18nKey, params);
      if (translated !== i18nKey) {
        const category = getErrorCategory(code);
        return {
          key: category,
          message: translated,
          i18nKey,
          details,
          code,
        };
      }
    }

    const category = getErrorCategory(code);
    const categoryI18nKey = `common:errors.${category}`;
    let message: string;
    if (translate) {
      const translated = translate(categoryI18nKey, params);
      message =
        translated !== categoryI18nKey
          ? translated
          : (defaultMessages?.[category] ?? categoryI18nKey);
    } else {
      message = defaultMessages?.[category] ?? categoryI18nKey;
    }

    return {
      key: category,
      message,
      i18nKey: i18nKey ?? categoryI18nKey,
      details,
      code,
    };
  }

  const status =
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: number }).status === 'number'
      ? (error as { status: number }).status
      : undefined;

  if (status !== undefined) {
    const category = getErrorCategoryFromStatus(status);
    const categoryI18nKey = `common:errors.${category}`;
    const message = translate
      ? translate(categoryI18nKey, params) !== categoryI18nKey
        ? translate(categoryI18nKey, params)
        : (defaultMessages?.[category] ?? categoryI18nKey)
      : (defaultMessages?.[category] ?? categoryI18nKey);

    return {
      key: category,
      message,
      i18nKey: categoryI18nKey,
      details,
    };
  }

  const category: UserFacingErrorKey = 'generic';
  const categoryI18nKey = `common:errors.${category}`;
  const message = translate
    ? translate(categoryI18nKey, params) !== categoryI18nKey
      ? translate(categoryI18nKey, params)
      : (defaultMessages?.[category] ?? categoryI18nKey)
    : (defaultMessages?.[category] ?? categoryI18nKey);

  return {
    key: category,
    message,
    i18nKey: categoryI18nKey,
    details,
  };
}
