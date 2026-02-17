import { DomainException } from '@qwery/domain/exceptions';
import { Code, type CodeDescription } from '@qwery/domain/common';
import { SAFE_ERROR_MESSAGE } from '@qwery/shared/error';

function getTechnicalDetails(error: unknown): string | undefined {
  if (error instanceof DomainException) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message !== SAFE_ERROR_MESSAGE ? error.message : undefined;
  }
  if (typeof error === 'string') {
    return error !== SAFE_ERROR_MESSAGE ? error : undefined;
  }
  return undefined;
}

export function handleDomainException(error: unknown): Response {
  if (error instanceof DomainException) {
    const status =
      error.code >= 2000 && error.code < 3000
        ? 404
        : error.code >= 400 && error.code < 500
          ? error.code
          : 500;
    const details = getTechnicalDetails(error);

    return Response.json(
      {
        code: error.code,
        params: error.data,
        details,
      },
      { status },
    );
  }
  const details = getTechnicalDetails(error);
  return Response.json(
    {
      code: 500,
      details,
    },
    { status: 500 },
  );
}

export function createValidationErrorResponse(
  message: string,
  code: CodeDescription = Code.BAD_REQUEST_ERROR,
): Response {
  const error = DomainException.new({
    code,
    overrideMessage: message,
  });
  return handleDomainException(error);
}

export function createNotFoundErrorResponse(
  message: string,
  code: CodeDescription = Code.ENTITY_NOT_FOUND_ERROR,
): Response {
  const error = DomainException.new({
    code,
    overrideMessage: message,
  });
  return handleDomainException(error);
}

export function parsePositiveInt(
  raw: string | null,
  fallback: number | null,
): number | null {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function parseLimit(
  raw: string | null,
  fallback: number,
  max: number,
): number {
  const parsed = parsePositiveInt(raw, fallback);
  if (parsed === null) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
