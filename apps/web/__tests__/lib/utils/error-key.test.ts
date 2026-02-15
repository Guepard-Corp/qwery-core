import { describe, expect, it, vi } from 'vitest';

import {
  ERROR_KEYS,
  getErrorKey,
  toastError,
} from '~/lib/utils/error-key';

describe('getErrorKey', () => {
  describe('permission / RLS', () => {
    it('returns permissionDenied for row-level security message', () => {
      expect(
        getErrorKey(
          new Error(
            'new row violates row-level security policy for table "conversations"',
          ),
        ),
      ).toBe(ERROR_KEYS.permissionDenied);
    });

    it('returns permissionDenied for violates + policy', () => {
      expect(getErrorKey(new Error('violates some policy'))).toBe(
        ERROR_KEYS.permissionDenied,
      );
    });

    it('returns permissionDenied for permission denied', () => {
      expect(getErrorKey(new Error('Permission denied'))).toBe(
        ERROR_KEYS.permissionDenied,
      );
    });

    it('returns permissionDenied for forbidden', () => {
      expect(getErrorKey(new Error('Forbidden'))).toBe(
        ERROR_KEYS.permissionDenied,
      );
    });
  });

  describe('network', () => {
    it('returns network for Failed to fetch', () => {
      expect(getErrorKey(new Error('Failed to fetch'))).toBe(
        ERROR_KEYS.network,
      );
    });

    it('returns network for ECONNRESET', () => {
      expect(getErrorKey(new Error('ECONNRESET'))).toBe(ERROR_KEYS.network);
    });

    it('returns network for ETIMEDOUT', () => {
      expect(getErrorKey(new Error('ETIMEDOUT'))).toBe(ERROR_KEYS.network);
    });

    it('returns network for load failed', () => {
      expect(getErrorKey(new Error('Load failed'))).toBe(ERROR_KEYS.network);
    });
  });

  describe('not found', () => {
    it('returns notFound for 404', () => {
      expect(getErrorKey(new Error('404 Not Found'))).toBe(
        ERROR_KEYS.notFound,
      );
    });

    it('returns notFound for not found', () => {
      expect(getErrorKey(new Error('Resource not found'))).toBe(
        ERROR_KEYS.notFound,
      );
    });

    it('returns notFound for PGRST116', () => {
      expect(getErrorKey(new Error('PGRST116'))).toBe(ERROR_KEYS.notFound);
    });
  });

  describe('generic fallback', () => {
    it('returns generic for unknown error message', () => {
      expect(getErrorKey(new Error('Something else'))).toBe(
        ERROR_KEYS.generic,
      );
    });

    it('returns generic for empty Error', () => {
      expect(getErrorKey(new Error(''))).toBe(ERROR_KEYS.generic);
    });
  });

  describe('input types', () => {
    it('handles string input', () => {
      expect(getErrorKey('row-level security')).toBe(
        ERROR_KEYS.permissionDenied,
      );
      expect(getErrorKey('random string')).toBe(ERROR_KEYS.generic);
    });

    it('handles non-Error object (stringified)', () => {
      expect(getErrorKey({ message: 'forbidden' })).toBe(
        ERROR_KEYS.generic,
      );
    });
  });

  describe('case insensitivity', () => {
    it('matches permission phrases case-insensitively', () => {
      expect(getErrorKey(new Error('ROW-LEVEL SECURITY'))).toBe(
        ERROR_KEYS.permissionDenied,
      );
      expect(getErrorKey(new Error('FORBIDDEN'))).toBe(
        ERROR_KEYS.permissionDenied,
      );
    });
  });
});

describe('toastError', () => {
  it('calls toast.error with translated key for the error', () => {
    const t = vi.fn((key: string) => key);
    const toast = { error: vi.fn() };
    const error = new Error('row-level security');

    toastError(error, t, toast);

    expect(t).toHaveBeenCalledWith(ERROR_KEYS.permissionDenied);
    expect(toast.error).toHaveBeenCalledWith(ERROR_KEYS.permissionDenied);
  });
});
