export {
  ERROR_CODES,
  type ErrorCode,
  getErrorCategory,
  getErrorCategoryFromStatus,
} from './codes';

export {
  type UserFacingErrorKey,
  USER_FACING_ERROR_KEYS,
  SAFE_ERROR_MESSAGE,
  ERROR_I18N_KEYS,
  type ApiErrorResponseBody,
  isUserFacingErrorKey,
  getErrorKeyFromError,
} from './keys';

export { ERROR_REGISTRY_OVERRIDES } from './overrides';

export {
  initializeTranslationValidation,
  clearErrorResolutionCache,
  type ErrorResolutionOptions,
  getI18nKeyForErrorCode,
  type ResolveErrorOptions,
  resolveError,
} from './resolution';
