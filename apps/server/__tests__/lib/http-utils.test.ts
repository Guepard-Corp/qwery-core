import { describe, expect, it } from 'vitest';

import { Code } from '@qwery/domain/common';
import { DomainException } from '@qwery/domain/exceptions';
import { getErrorKeyFromError } from '@qwery/shared/error';

import {
  handleDomainException,
  isUUID,
  parseLimit,
  parsePositiveInt,
} from '../../src/lib/http-utils';

describe('parsePositiveInt', () => {
  it('returns fallback when raw is null or empty', () => {
    expect(parsePositiveInt(null, 10)).toBe(10);
    expect(parsePositiveInt('', 5)).toBe(5);
  });

  it('returns parsed integer when valid and positive', () => {
    expect(parsePositiveInt('1', 0)).toBe(1);
    expect(parsePositiveInt('42', 0)).toBe(42);
    expect(parsePositiveInt('100', null)).toBe(100);
  });

  it('returns fallback when parsed is not finite or <= 0', () => {
    expect(parsePositiveInt('0', 10)).toBe(10);
    expect(parsePositiveInt('-1', 10)).toBe(10);
    expect(parsePositiveInt('abc', 10)).toBe(10);
    expect(parsePositiveInt('NaN', 10)).toBe(10);
  });
});

describe('parseLimit', () => {
  it('returns fallback when raw is null or invalid', () => {
    expect(parseLimit(null, 10, 100)).toBe(10);
    expect(parseLimit('', 20, 100)).toBe(20);
    expect(parseLimit('0', 10, 100)).toBe(10);
  });

  it('returns parsed value capped at max', () => {
    expect(parseLimit('50', 10, 100)).toBe(50);
    expect(parseLimit('100', 10, 100)).toBe(100);
    expect(parseLimit('200', 10, 100)).toBe(100);
  });

  it('returns fallback when parsed is null', () => {
    expect(parseLimit('x', 10, 100)).toBe(10);
  });
});

describe('isUUID', () => {
  it('returns true for valid UUIDs', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(isUUID('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(true);
  });

  it('returns false for invalid strings', () => {
    expect(isUUID('')).toBe(false);
    expect(isUUID('not-a-uuid')).toBe(false);
    expect(isUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
    expect(isUUID('550e8400e29b41d4a716446655440000')).toBe(false);
  });
});

describe('getErrorKeyFromError', () => {
  it('returns notFound for DomainException with code in 2000-2999', () => {
    const error = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Not found',
    });
    expect(getErrorKeyFromError(error)).toBe('notFound');
  });

  it('returns generic for raw Error with no code/status (message-rule matching is app-layer responsibility; shared resolves only code/status)', () => {
    expect(
      getErrorKeyFromError(
        new Error('new row violates row-level security policy for table "x"'),
      ),
    ).toBe('generic');
  });

  it('returns generic for unknown Error', () => {
    expect(getErrorKeyFromError(new Error('Something failed'))).toBe('generic');
  });
});

describe('handleDomainException', () => {
  it('returns 404 and code for DomainException with code in 2000-2999', async () => {
    const error = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Not found',
    });
    const res = handleDomainException(error);
    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      code: number;
      params?: unknown;
      details?: string;
    };
    expect(body.code).toBe(2000);
    expect(body.params).toBeUndefined();
  });

  it('returns error.code for DomainException with code in 400-499', async () => {
    const error = DomainException.new({
      code: Code.BAD_REQUEST_ERROR,
      overrideMessage: 'Bad request',
    });
    const res = handleDomainException(error);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: number };
    expect(body.code).toBe(400);
  });

  it('returns 500 and code for DomainException with INTERNAL_ERROR', async () => {
    const error = DomainException.new({
      code: Code.INTERNAL_ERROR,
      overrideMessage: 'Internal',
    });
    const res = handleDomainException(error);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code: number };
    expect(body.code).toBe(500);
  });

  it('returns 502 and code for DomainException with BAD_GATEWAY_ERROR', async () => {
    const error = DomainException.new({
      code: Code.BAD_GATEWAY_ERROR,
      overrideMessage: 'Bad gateway',
    });
    const res = handleDomainException(error);
    expect(res.status).toBe(502);
    const body = (await res.json()) as { code: number };
    expect(body.code).toBe(502);
  });

  it('returns 503 and code for DomainException with SERVICE_UNAVAILABLE_ERROR', async () => {
    const error = DomainException.new({
      code: Code.SERVICE_UNAVAILABLE_ERROR,
      overrideMessage: 'Service unavailable',
    });
    const res = handleDomainException(error);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code: number };
    expect(body.code).toBe(503);
  });

  it('returns 500 with code for generic Error', async () => {
    const res = handleDomainException(new Error('Something failed'));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code: number; details?: string };
    expect(body.code).toBe(500);
    expect(body.details).toBe('Something failed');
  });

  it('returns 500 with code for non-Error throw', async () => {
    const res = handleDomainException('string error');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code: number; details?: string };
    expect(body.code).toBe(500);
    expect(body.details).toBe('string error');
  });

  it('returns 500 with code and details for RLS error', async () => {
    const res = handleDomainException(
      new Error(
        'new row violates row-level security policy for table "conversations"',
      ),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { code: number; details?: string };
    expect(body.code).toBe(500);
    expect(body.details).toContain('row-level security');
  });

  it('includes params when DomainException has data', async () => {
    const error = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Not found',
      data: { notebookId: '123' },
    });
    const res = handleDomainException(error);
    const body = (await res.json()) as {
      code: number;
      params?: unknown;
    };
    expect(body.code).toBe(2000);
    expect(body.params).toEqual({ notebookId: '123' });
  });

  it('strips details in production (NODE_ENV === "production")', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = handleDomainException(new Error('internal message'));
      const body = (await res.json()) as { code: number; details?: string };
      expect(body.code).toBe(500);
      expect(body.details).toBeUndefined();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
