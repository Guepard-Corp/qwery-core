import { ERROR_CODES } from './codes';

export const ERROR_REGISTRY_OVERRIDES: Record<number, string> = {
  [ERROR_CODES.UNAUTHORIZED]: 'common:errors.unauthorized',
  [ERROR_CODES.ACCESS_DENIED]: 'common:errors.accessDenied',
  [ERROR_CODES.ENTITY_NOT_FOUND]: 'common:errors.entityNotFound',
  [ERROR_CODES.ENTITY_VALIDATION_ERROR]: 'common:errors.entityValidationError',
  [ERROR_CODES.USE_CASE_PORT_VALIDATION_ERROR]:
    'common:errors.useCasePortValidationError',
  [ERROR_CODES.VALUE_OBJECT_VALIDATION_ERROR]:
    'common:errors.valueObjectValidationError',
  [ERROR_CODES.ENTITY_ALREADY_EXISTS]: 'common:errors.entityAlreadyExists',
} as const;
