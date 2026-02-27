import { describe, expect, it } from 'vitest';
import { normalizeErrorForResolution } from '~/lib/error-adapter';
import { ApiError } from '~/lib/repositories/api-client';
import { ERROR_CODES } from '@qwery/shared/error';

describe('normalizeErrorForResolution', () => {
  it('returns status 403 for row-level security violations', () => {
    const messages = [
      'new row violates row-level security policy for table "x"',
      'permission denied for table due to row-level security',
      'Row-level security policy violation',
    ];

    for (const msg of messages) {
      const error = new Error(msg);
      const result = normalizeErrorForResolution(error);
      expect(result).toEqual({ status: 403 });
    }
  });

  it('returns status 404 for "not found" messages including PostgREST codes', () => {
    const messages = ['Resource not found', '404 Not Found', 'pgrst116'];

    for (const msg of messages) {
      const error = new Error(msg);
      const result = normalizeErrorForResolution(error);
      expect(result).toEqual({ status: 404 });
    }
  });

  it('returns status 0 for network-like messages', () => {
    const messages = [
      'failed to fetch',
      'Network error while fetching',
      'load failed',
    ];

    for (const msg of messages) {
      const error = new Error(msg);
      const result = normalizeErrorForResolution(error);
      expect(result).toEqual({ status: 0 });
    }
  });

  it('passes through error that already has numeric code', () => {
    const error = { code: 2000, details: 'Not found' };
    const result = normalizeErrorForResolution(error);
    expect(result).toBe(error);
    expect(result).toEqual({ code: 2000, details: 'Not found' });
  });

  it('passes through ApiError with numeric code completely untouched', () => {
    const error = new ApiError(
      404,
      ERROR_CODES.NOTEBOOK_NOT_FOUND,
      undefined,
      'Not found',
    );
    const result = normalizeErrorForResolution(error);
    expect(result).toBe(error);
    expect(result).toBeInstanceOf(ApiError);
    expect((result as ApiError).code).toBe(ERROR_CODES.NOTEBOOK_NOT_FOUND);
    expect((result as ApiError).status).toBe(404);
  });
});
