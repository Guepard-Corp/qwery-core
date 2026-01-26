import { DomainException } from '@qwery/domain/exceptions';

export function handleDomainException(error: unknown): Response {
  if (error instanceof DomainException) {
    const status =
      error.code >= 2000 && error.code < 3000
        ? 404
        : error.code >= 400 && error.code < 500
          ? error.code
          : 500;
    return Response.json(
      {
        error: error.message,
        code: error.code,
        data: error.data,
      },
      { status },
    );
  }

  const errorMessage =
    error instanceof Error ? error.message : 'Internal server error';
  return Response.json({ error: errorMessage }, { status: 500 });
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
