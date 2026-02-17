import {
  ERROR_CODES,
  getErrorCategory,
  getErrorCategoryFromStatus,
} from './codes';
import type { UserFacingErrorKey } from './keys';

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

/**
 * Transforms error code property names to i18n keys.
 *
 * Transformation patterns (in order of precedence):
 * 1. Single word: NOTEBOOK -> common:errors.notebook
 * 2. Simple flat errors: BAD_REQUEST -> common:errors.badRequest
 * 3. Use case patterns: USE_CASE_* -> common:errors.useCase*
 * 4. Not found patterns: ENTITY_NOT_FOUND -> common:errors.entity.notFound
 * 5. Already exists: ENTITY_ALREADY_EXISTS -> common:errors.entity.alreadyExists
 * 6. Agent-specific patterns: AGENT_SESSION_NOT_FOUND -> common:errors.agent.sessionNotFound
 * 7. State machine patterns: STATE_MACHINE_NOT_FOUND -> common:errors.agent.stateMachineNotFound
 * 8. Invalid state transition: INVALID_STATE_TRANSITION -> common:errors.agent.invalidStateTransition
 * 9. Agent action not found: AGENT_ACTION_NOT_FOUND -> common:errors.agent.actionNotFound
 * 10. Agent actions: AGENT_ACTION -> common:errors.agent.action
 * 11. Entity-action patterns: ENTITY_ACTION -> common:errors.entity.action
 * 12. Fallback: Transform entire name to camelCase
 *
 * @param propertyName - Error code property name (e.g., "NOTEBOOK_NOT_FOUND")
 * @returns i18n key (e.g., "common:errors.notebook.notFound")
 */
function transformPropertyNameToI18nKey(propertyName: string): string {
  let name = propertyName;
  const hadErrorSuffix = name.endsWith('_ERROR');

  if (hadErrorSuffix) {
    name = name.slice(0, -6);
  }

  const parts = name.split('_');

  // Pattern 1: Single word errors
  if (parts.length === 1) {
    const base = toCamelCase(name);
    return hadErrorSuffix
      ? `common:errors.${base}Error`
      : `common:errors.${base}`;
  }

  const firstPart = parts[0]!;
  const remainingParts = parts.slice(1);

  // Pattern 2: Simple flat errors (BAD_REQUEST, WRONG_CREDENTIALS, etc.)
  const simpleFlatErrors = ['BAD', 'WRONG', 'ENTITY', 'USE', 'VALUE'];

  if (
    parts.length === 2 &&
    simpleFlatErrors.includes(firstPart) &&
    !remainingParts.some((p) => p === 'NOT' || p === 'ALREADY')
  ) {
    const fullName = hadErrorSuffix ? `${name}_ERROR` : name;
    return `common:errors.${toCamelCase(fullName)}`;
  }

  // Pattern 3: Use case patterns (USE_CASE_PORT_VALIDATION_ERROR)
  if (
    firstPart === 'USE' &&
    remainingParts.length >= 2 &&
    remainingParts[0] === 'CASE'
  ) {
    const fullName = hadErrorSuffix ? `${name}_ERROR` : name;
    return `common:errors.${toCamelCase(fullName)}`;
  }

  // Pattern 4: Not found patterns (NOTEBOOK_NOT_FOUND -> notebook.notFound)
  if (
    remainingParts.length === 2 &&
    remainingParts[0] === 'NOT' &&
    remainingParts[1] === 'FOUND'
  ) {
    const entity = toCamelCase(firstPart);
    return `common:errors.${entity}.notFound`;
  }

  // Pattern 5: Already exists patterns (NOTEBOOK_ALREADY_EXISTS -> notebook.alreadyExists)
  if (
    remainingParts.length === 2 &&
    remainingParts[0] === 'ALREADY' &&
    remainingParts[1] === 'EXISTS'
  ) {
    const entity = toCamelCase(firstPart);
    return `common:errors.${entity}.alreadyExists`;
  }

  // Pattern 6: Agent session not found (special case)
  if (
    firstPart === 'AGENT' &&
    remainingParts.length >= 3 &&
    remainingParts[0] === 'SESSION' &&
    remainingParts[1] === 'NOT' &&
    remainingParts[2] === 'FOUND'
  ) {
    return `common:errors.agent.sessionNotFound`;
  }

  // Pattern 7: State machine not found (special case)
  if (
    firstPart === 'STATE' &&
    remainingParts.length >= 3 &&
    remainingParts[0] === 'MACHINE' &&
    remainingParts[1] === 'NOT' &&
    remainingParts[2] === 'FOUND'
  ) {
    return `common:errors.agent.stateMachineNotFound`;
  }

  // Pattern 8: Invalid state transition (special case)
  if (
    firstPart === 'INVALID' &&
    remainingParts.length === 2 &&
    remainingParts[0] === 'STATE' &&
    remainingParts[1] === 'TRANSITION'
  ) {
    return `common:errors.agent.invalidStateTransition`;
  }

  // Pattern 9: Agent action not found (AGENT_ACTION_NOT_FOUND -> agent.actionNotFound)
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

  // Pattern 10: Agent actions (AGENT_ACTION -> agent.action)
  if (firstPart === 'AGENT' && remainingParts.length > 0) {
    const action = toCamelCase(remainingParts.join('_'));
    return `common:errors.agent.${action}`;
  }

  // Pattern 11: Entity-action patterns (NOTEBOOK_UPDATE_ERROR -> notebook.updateError)
  if (parts.length >= 2 && firstPart) {
    const entity = toCamelCase(firstPart);
    const action = toCamelCase(remainingParts.join('_'));
    return hadErrorSuffix
      ? `common:errors.${entity}.${action}Error`
      : `common:errors.${entity}.${action}`;
  }

  // Pattern 12: Fallback - transform entire name
  const base = toCamelCase(name);
  return hadErrorSuffix
    ? `common:errors.${base}Error`
    : `common:errors.${base}`;
}

const i18nKeyCache = new Map<number, string>();

let translationKeySet: Set<string> | null = null;
let translationKeySetHash: string | null = null;
let initializationLock = false;
const isDevelopment =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

function simpleHash(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function buildTranslationKeySet(
  obj: Record<string, unknown>,
  prefix = '',
): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
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
  if (initializationLock) {
    return;
  }

  const newHash = simpleHash(translations);
  if (translationKeySet && translationKeySetHash === newHash) {
    return;
  }

  initializationLock = true;
  try {
    translationKeySet = buildTranslationKeySet(translations);
    translationKeySetHash = newHash;
  } finally {
    initializationLock = false;
  }
}

export function clearErrorResolutionCache(): void {
  i18nKeyCache.clear();
  translationKeySet = null;
  translationKeySetHash = null;
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
  const { overrides, validateKey, onValidationFailure, translations } = options;

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
      console.warn(`[Error Registry] No property name found for code ${code}`);
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
    return i18nKey;
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
    if (
      err !== null &&
      err !== undefined &&
      typeof err === 'object' &&
      'code' in err
    ) {
      const code = (err as { code: unknown }).code;
      if (typeof code === 'number') return code;
    }
    return undefined;
  }

  function getDetails(err: unknown): string | undefined {
    if (
      err !== null &&
      err !== undefined &&
      typeof err === 'object' &&
      'details' in err
    ) {
      const details = (err as { details?: unknown }).details;
      if (typeof details === 'string') {
        return details;
      }
    }
    return undefined;
  }

  function getParams(err: unknown): Record<string, unknown> | undefined {
    if (
      err !== null &&
      err !== undefined &&
      typeof err === 'object' &&
      'params' in err
    ) {
      const params = (err as { params?: unknown }).params;
      if (
        params !== null &&
        params !== undefined &&
        typeof params === 'object' &&
        !Array.isArray(params)
      ) {
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
      try {
        const translated = translate(i18nKey, params);
        if (translated && translated !== i18nKey && translated.trim() !== '') {
          const category = getErrorCategory(code);
          return {
            key: category,
            message: translated,
            i18nKey,
            details,
            code,
          };
        }
      } catch {
        // Translation function threw, fall through to category fallback
      }
    }

    const category = getErrorCategory(code);
    const categoryI18nKey = `common:errors.${category}`;
    let message: string;
    if (translate) {
      try {
        const translated = translate(categoryI18nKey, params);
        if (
          translated &&
          translated !== categoryI18nKey &&
          translated.trim() !== ''
        ) {
          message = translated;
        } else {
          message = defaultMessages?.[category] ?? categoryI18nKey;
        }
      } catch {
        message = defaultMessages?.[category] ?? categoryI18nKey;
      }
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
    let message: string;
    if (translate) {
      try {
        const translated = translate(categoryI18nKey, params);
        if (
          translated &&
          translated !== categoryI18nKey &&
          translated.trim() !== ''
        ) {
          message = translated;
        } else {
          message = defaultMessages?.[category] ?? categoryI18nKey;
        }
      } catch {
        message = defaultMessages?.[category] ?? categoryI18nKey;
      }
    } else {
      message = defaultMessages?.[category] ?? categoryI18nKey;
    }

    return {
      key: category,
      message,
      i18nKey: categoryI18nKey,
      details,
    };
  }

  const category: UserFacingErrorKey = 'generic';
  const categoryI18nKey = `common:errors.${category}`;
  let message: string;
  if (translate) {
    try {
      const translated = translate(categoryI18nKey, params);
      if (
        translated &&
        translated !== categoryI18nKey &&
        translated.trim() !== ''
      ) {
        message = translated;
      } else {
        message = defaultMessages?.[category] ?? categoryI18nKey;
      }
    } catch {
      message = defaultMessages?.[category] ?? categoryI18nKey;
    }
  } else {
    message = defaultMessages?.[category] ?? categoryI18nKey;
  }

  return {
    key: category,
    message,
    i18nKey: categoryI18nKey,
    details,
  };
}
