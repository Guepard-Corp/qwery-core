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
