import { DomainException } from '@qwery/domain/exceptions';
import {
  getErrorKeyFromError,
  SAFE_ERROR_MESSAGE,
} from '@qwery/shared/error-keys';

export function handleDomainException(error: unknown): Response {
  if (error instanceof DomainException) {
    const status =
      error.code >= 2000 && error.code < 3000
        ? 404
        : error.code >= 400 && error.code < 500
          ? error.code
          : 500;
    const errorKey = getErrorKeyFromError(error);
    return Response.json(
      {
        errorKey,
        code: error.code,
        data: error.data,
        error: SAFE_ERROR_MESSAGE,
      },
      { status },
    );
  }
  const errorKey = getErrorKeyFromError(error);
  return Response.json(
    { errorKey, error: SAFE_ERROR_MESSAGE },
    { status: 500 },
  );
}
