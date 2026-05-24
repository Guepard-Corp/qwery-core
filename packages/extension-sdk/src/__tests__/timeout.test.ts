import { describe, expect, test } from 'bun:test';
import { DEFAULT_CONNECTION_TEST_TIMEOUT_MS, withTimeout } from '../timeout';

describe('withTimeout', () => {
  test('resolves with the underlying value when it beats the timeout', async () => {
    const r = await withTimeout(Promise.resolve(42), 100);
    expect(r).toBe(42);
  });

  test('rejects when the underlying promise is too slow', async () => {
    const slow = new Promise<number>((resolve) => setTimeout(() => resolve(1), 200));
    await expect(withTimeout(slow, 20)).rejects.toThrow(/timed out/);
  });

  test('uses the custom error message when provided', async () => {
    const slow = new Promise<number>((resolve) => setTimeout(() => resolve(1), 200));
    await expect(withTimeout(slow, 20, 'custom boom')).rejects.toThrow(/custom boom/);
  });

  test('propagates underlying rejection unchanged', async () => {
    const failing = Promise.reject(new Error('inner failure'));
    await expect(withTimeout(failing, 100)).rejects.toThrow('inner failure');
  });

  test('default timeout constant is 30 seconds', () => {
    expect(DEFAULT_CONNECTION_TEST_TIMEOUT_MS).toBe(30_000);
  });
});
