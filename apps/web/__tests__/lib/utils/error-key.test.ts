import { describe, expect, it, vi } from 'vitest';

import { ERROR_KEYS, getErrorKey, toastError } from '~/lib/utils/error-key';
import {
  ERROR_CODES,
  getI18nKeyForErrorCode,
  ERROR_REGISTRY_OVERRIDES,
  initializeTranslationValidation,
  resolveError,
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

  it('transforms NOTEBOOK_ALREADY_EXISTS to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_ALREADY_EXISTS, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.notebook.alreadyExists');
  });

  it('transforms NOTEBOOK_CREATE_ERROR to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_CREATE_ERROR, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.notebook.createError');
  });

  it('transforms NOTEBOOK_DELETE_ERROR to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_DELETE_ERROR, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.notebook.deleteError');
  });

  it('transforms NOTEBOOK_GET_ERROR to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_GET_ERROR, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.notebook.getError');
  });

  it('transforms USER_ALREADY_EXISTS to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.USER_ALREADY_EXISTS, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.user.alreadyExists');
  });

  it('transforms PROJECT_NOT_FOUND to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.PROJECT_NOT_FOUND, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.project.notFound');
  });

  it('transforms DATASOURCE_ALREADY_EXISTS to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.DATASOURCE_ALREADY_EXISTS, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.datasource.alreadyExists');
  });

  it('transforms CONVERSATION_CREATE_ERROR to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.CONVERSATION_CREATE_ERROR, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.conversation.createError');
  });

  it('transforms MESSAGE_DELETE_ERROR to correct i18n key', () => {
    expect(
      getI18nKeyForErrorCode(ERROR_CODES.MESSAGE_DELETE_ERROR, {
        overrides: ERROR_REGISTRY_OVERRIDES,
      }),
    ).toBe('common:errors.message.deleteError');
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

  describe('runtime validation', () => {
    it('validates i18n keys when validateKey callback provided', () => {
      const mockValidateKey = vi.fn((key: string) => {
        return key.includes('project.createError');
      });
      const mockOnValidationFailure = vi.fn();

      const result = getI18nKeyForErrorCode(ERROR_CODES.PROJECT_CREATE_ERROR, {
        validateKey: mockValidateKey,
        onValidationFailure: mockOnValidationFailure,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });

      expect(mockValidateKey).toHaveBeenCalledWith(
        'common:errors.project.createError',
      );
      expect(mockOnValidationFailure).not.toHaveBeenCalled();
      expect(result).toBe('common:errors.project.createError');
    });

    it('calls onValidationFailure when validateKey returns false', () => {
      const mockValidateKey = vi.fn(() => false);
      const mockOnValidationFailure = vi.fn();

      const result = getI18nKeyForErrorCode(ERROR_CODES.PROJECT_DELETE_ERROR, {
        validateKey: mockValidateKey,
        onValidationFailure: mockOnValidationFailure,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });

      expect(mockValidateKey).toHaveBeenCalledWith(
        'common:errors.project.deleteError',
      );
      expect(mockOnValidationFailure).toHaveBeenCalledWith(
        'common:errors.project.deleteError',
        ERROR_CODES.PROJECT_DELETE_ERROR,
      );
      expect(result).toBe('common:errors.project.deleteError');
    });

    it('initializes validation when translations provided', () => {
      const translations = {
        errors: {
          notebook: {
            notFound: 'Notebook not found',
          },
        },
      };

      const result = getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_NOT_FOUND, {
        translations,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });

      expect(result).toBe('common:errors.notebook.notFound');
    });

    it('validates keys against translation set when initialized', () => {
      const translations = {
        errors: {
          message: {
            notFound: 'Message not found',
          },
        },
      };

      const mockOnValidationFailure = vi.fn();

      const result1 = getI18nKeyForErrorCode(ERROR_CODES.MESSAGE_NOT_FOUND, {
        translations,
        onValidationFailure: mockOnValidationFailure,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });

      expect(result1).toBe('common:errors.message.notFound');

      const result2 = getI18nKeyForErrorCode(ERROR_CODES.MESSAGE_CREATE_ERROR, {
        translations,
        onValidationFailure: mockOnValidationFailure,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });

      expect(result2).toBe('common:errors.message.createError');
    });

    it('uses initializeTranslationValidation function', () => {
      const translations = {
        errors: {
          notebook: {
            notFound: 'Notebook not found',
            createError: 'Failed to create notebook',
          },
        },
      };

      initializeTranslationValidation(translations);

      const mockOnValidationFailure = vi.fn();

      getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_NOT_FOUND, {
        onValidationFailure: mockOnValidationFailure,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });

      expect(mockOnValidationFailure).not.toHaveBeenCalled();

      getI18nKeyForErrorCode(ERROR_CODES.NOTEBOOK_CREATE_ERROR, {
        onValidationFailure: mockOnValidationFailure,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });

      expect(mockOnValidationFailure).not.toHaveBeenCalled();
    });
  });
});

describe('resolveError edge cases', () => {
  describe('null and undefined error handling', () => {
    it('handles null error gracefully', () => {
      const result = resolveError(null, { translate: mockT });
      expect(result.key).toBe('generic');
      expect(result.message).toBe(ERROR_KEYS.generic);
    });

    it('handles undefined error gracefully', () => {
      const result = resolveError(undefined, { translate: mockT });
      expect(result.key).toBe('generic');
      expect(result.message).toBe(ERROR_KEYS.generic);
    });
  });

  describe('translation function error handling', () => {
    it('handles translation function throwing', () => {
      const throwingTranslate = vi.fn(() => {
        throw new Error('Translation failed');
      });
      const error = new ApiError(404, ERROR_CODES.NOTEBOOK_NOT_FOUND);
      const result = resolveError(error, {
        translate: throwingTranslate,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      expect(result.key).toBe('notFound');
      expect(result.message).toBe(ERROR_KEYS.notFound);
    });

    it('handles translation function returning empty string', () => {
      const emptyTranslate = vi.fn(() => '');
      const error = new ApiError(404, ERROR_CODES.NOTEBOOK_NOT_FOUND);
      const result = resolveError(error, {
        translate: emptyTranslate,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      expect(result.key).toBe('notFound');
      expect(result.message).toBe(ERROR_KEYS.notFound);
    });

    it('handles translation function returning whitespace only', () => {
      const whitespaceTranslate = vi.fn(() => '   ');
      const error = new ApiError(404, ERROR_CODES.NOTEBOOK_NOT_FOUND);
      const result = resolveError(error, {
        translate: whitespaceTranslate,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      expect(result.key).toBe('notFound');
      expect(result.message).toBe(ERROR_KEYS.notFound);
    });
  });

  describe('params handling', () => {
    it('passes params to translation function', () => {
      const t = vi.fn((key: string, params?: Record<string, unknown>) => {
        if (key === 'common:errors.notebook.notFound' && params?.notebookId) {
          return `Notebook ${params.notebookId} not found`;
        }
        return key;
      });
      const error = {
        status: 404,
        code: ERROR_CODES.NOTEBOOK_NOT_FOUND,
        params: { notebookId: '123' },
      };
      const result = resolveError(error, {
        translate: t,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      expect(t).toHaveBeenCalledWith('common:errors.notebook.notFound', {
        notebookId: '123',
      });
      expect(result.message).toBe('Notebook 123 not found');
    });

    it('handles null params gracefully', () => {
      const t = vi.fn((key: string, _params?: Record<string, unknown>) => key);
      const error = {
        status: 404,
        code: ERROR_CODES.NOTEBOOK_NOT_FOUND,
        params: null,
      };
      const result = resolveError(error, {
        translate: t,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      expect(t).toHaveBeenCalledWith(
        'common:errors.notebook.notFound',
        undefined,
      );
      expect(result.message).toBe(ERROR_KEYS.notFound);
    });

    it('handles array params (should be ignored)', () => {
      const t = vi.fn((key: string, _params?: Record<string, unknown>) => key);
      const error = {
        status: 404,
        code: ERROR_CODES.NOTEBOOK_NOT_FOUND,
        params: ['invalid'],
      };
      const result = resolveError(error, {
        translate: t,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      expect(t).toHaveBeenCalledWith(
        'common:errors.notebook.notFound',
        undefined,
      );
      expect(result.message).toBe(ERROR_KEYS.notFound);
    });
  });

  describe('error code edge cases', () => {
    it('handles error with code but no i18n key', () => {
      const error = { code: 9999 };
      const result = resolveError(error, { translate: mockT });
      expect(result.key).toBe('generic');
      expect(result.code).toBe(9999);
    });

    it('handles error with string code', () => {
      const error = { code: 'INVALID_CODE' };
      const result = resolveError(error, { translate: mockT });
      expect(result.key).toBe('generic');
      expect(result.code).toBeUndefined();
    });
  });

  describe('status-based fallback', () => {
    it('handles status 0 as network error', () => {
      const error = { status: 0 };
      const result = resolveError(error, { translate: mockT });
      expect(result.key).toBe('network');
      expect(result.message).toBe(ERROR_KEYS.network);
    });

    it('handles status 503 as network error', () => {
      const error = { status: 503 };
      const result = resolveError(error, { translate: mockT });
      expect(result.key).toBe('network');
      expect(result.message).toBe(ERROR_KEYS.network);
    });
  });

  describe('details extraction', () => {
    it('extracts details from error object', () => {
      const error = {
        code: ERROR_CODES.NOTEBOOK_NOT_FOUND,
        details: 'Notebook was deleted',
      };
      const result = resolveError(error, {
        translate: mockT,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      expect(result.details).toBe('Notebook was deleted');
    });

    it('handles non-string details', () => {
      const error = {
        code: ERROR_CODES.NOTEBOOK_NOT_FOUND,
        details: { nested: 'object' },
      };
      const result = resolveError(error, {
        translate: mockT,
        overrides: ERROR_REGISTRY_OVERRIDES,
      });
      expect(result.details).toBeUndefined();
    });
  });
});
