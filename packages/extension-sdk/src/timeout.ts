/** Default timeout for connection tests (30 seconds). */
export const DEFAULT_CONNECTION_TEST_TIMEOUT_MS = 30_000;

/**
 * Race a promise against a timeout. Rejects if the original promise doesn't
 * resolve in time. Used by extension drivers for `testConnection()` and
 * metadata fetches that might hang on a slow remote source.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage ?? `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    throw err;
  }
}
