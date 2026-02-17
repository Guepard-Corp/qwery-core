import { describe, expect, it, vi } from 'vitest';

import { ERROR_KEYS, getErrorKey, toastError } from '~/lib/utils/error-key';
import {
  ERROR_CODES,
  getI18nKeyForErrorCode,
  ERROR_REGISTRY_OVERRIDES,
} from '@qwery/shared/error';
import { ApiError } from '~/lib/repositories/api-client';

const mockT = vi.fn((key: string, _params?: Record<string, unknown>) => key);

describe('getErrorKey', () => {
  describe('code-based (preferred)', () => {
    it('returns translated message for known error code', () => {
      const t = vi.fn((key: string, _params?: Record<string, unknown>) => {
        if (key === 'common:errors.notebook.notFound')
          return 'Notebook not found';
        return key;
      });
      const error = new ApiError(404, ERROR_CODES.NOTEBOOK_NOT_FOUND);
      expect(getErrorKey(error, t)).toBe('Notebook not found');
    });

    it('returns category i18n key when code not in registry', () => {
      const error = new ApiError(404, 2999);
      expect(getErrorKey(error, mockT)).toBe(ERROR_KEYS.notFound);
    });

    it('returns generic when code is undefined', () => {
      expect(getErrorKey({}, mockT)).toBe(ERROR_KEYS.generic);
    });
  });

  describe('status-based (fallback)', () => {
    it('returns permissionDenied for status 403', () => {
      expect(getErrorKey({ status: 403 }, mockT)).toBe(
        ERROR_KEYS.permissionDenied,
      );
    });

    it('returns permissionDenied for status 401', () => {
      expect(getErrorKey({ status: 401 }, mockT)).toBe(
        ERROR_KEYS.permissionDenied,
      );
    });

    it('returns notFound for status 404', () => {
      expect(getErrorKey({ status: 404 }, mockT)).toBe(ERROR_KEYS.notFound);
    });

    it('returns network for status 502', () => {
      expect(getErrorKey({ status: 502 }, mockT)).toBe(ERROR_KEYS.network);
    });

    it('returns generic for status 500', () => {
      expect(getErrorKey({ status: 500 }, mockT)).toBe(ERROR_KEYS.generic);
    });
  });

  describe('without translation function', () => {
    it('returns i18n key string when t is not provided', () => {
      const error = new ApiError(404, ERROR_CODES.NOTEBOOK_NOT_FOUND);
      expect(getErrorKey(error)).toBe(ERROR_KEYS.generic);
    });
  });
});

describe('toastError', () => {
  it('calls toast.error with translated message for the error', () => {
    const t = vi.fn((key: string, _params?: Record<string, unknown>) => {
      if (key === 'common:errors.notebook.notFound')
        return 'Notebook not found';
      return key;
    });
    const toast = { error: vi.fn() };
    const error = new ApiError(404, ERROR_CODES.NOTEBOOK_NOT_FOUND);

    toastError(error, t, toast);

    expect(t).toHaveBeenCalledWith(
      'common:errors.notebook.notFound',
      undefined,
    );
    expect(toast.error).toHaveBeenCalledWith('Notebook not found');
  });

  it('passes params to translate function when error has params', () => {
    const t = vi.fn((key: string, params?: Record<string, unknown>) => {
      if (key === 'common:errors.notebook.notFound' && params?.notebookId) {
        return `Notebook ${params.notebookId} not found`;
      }
      return key;
    });
    const toast = { error: vi.fn() };
    const error = {
      status: 404,
      code: ERROR_CODES.NOTEBOOK_NOT_FOUND,
      params: { notebookId: '123' },
    };

    toastError(error, t, toast);

    expect(t).toHaveBeenCalledWith('common:errors.notebook.notFound', {
      notebookId: '123',
    });
    expect(toast.error).toHaveBeenCalledWith('Notebook 123 not found');
  });
});

describe('getI18nKeyForErrorCode', () => {
  it('transforms NOTEBOOK_NOT_FOUND to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_NOT_FOUND, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.notebook.notFound');
  });

  it('transforms BAD_REQUEST to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.BAD_REQUEST, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.badRequest');
  });

  it('transforms AGENT_SESSION_NOT_FOUND to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.AGENT_SESSION_NOT_FOUND, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.agent.sessionNotFound');
  });

  it('transforms STATE_MACHINE_NOT_FOUND to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.STATE_MACHINE_NOT_FOUND, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.agent.stateMachineNotFound');
  });

  it('transforms INVALID_STATE_TRANSITION to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.INVALID_STATE_TRANSITION, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.agent.invalidStateTransition');
  });

  it('transforms NOTEBOOK_UPDATE_ERROR to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_UPDATE_ERROR, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.notebook.updateError');
  });

  it('transforms USE_CASE_PORT_VALIDATION_ERROR to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.USE_CASE_PORT_VALIDATION_ERROR, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.useCasePortValidationError');
  });

  it('returns undefined for unknown error code', () => {
    expect(getI18nKeyForErrorCode(9999)).toBeUndefined();
  });

  it('caches transformations', () => {
    const code = ERROR_CODES.NOTEBOOK_NOT_FOUND;
    const first = getI18nKeyForErrorCode(code, {
      overrides: ERROR_REGISTRY_OVERRIDES,
    });
    const second = getI18nKeyForErrorCode(code, {
      overrides: ERROR_REGISTRY_OVERRIDES,
    });
    expect(first).toBe(second);
    expect(first).toBe('common:errors.notebook.notFound');
  });
});
