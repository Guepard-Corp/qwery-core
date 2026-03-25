type WindowEntry = { count: number; resetAt: number };

const windows = new Map<string, WindowEntry>();
const MAX_KEYS = 10_000;

export function resetRateLimitStateForTests(): void {
  windows.clear();
}

export function checkRateLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  const now = Date.now();

  const entry = windows.get(key);
  if (!entry || now > entry.resetAt) {
    if (windows.size >= MAX_KEYS) windows.clear();
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxPerWindow) return false;
  entry.count += 1;
  return true;
}
