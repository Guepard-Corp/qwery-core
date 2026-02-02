import { describe, expect, it } from 'vitest';

import { Code } from '@qwery/domain/common';
import { DomainException } from '@qwery/domain/exceptions';

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

describe('handleDomainException', () => {
  it('returns 404 for DomainException with code in 2000-2999', async () => {
    const error = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Not found',
    });
    const res = handleDomainException(error);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; code: number };
    expect(body.error).toBe('Not found');
    expect(body.code).toBe(2000);
  });

  it('returns error.code for DomainException with code in 400-499', async () => {
    const error = DomainException.new({
      code: Code.BAD_REQUEST_ERROR,
      overrideMessage: 'Bad request',
    });
    const res = handleDomainException(error);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; code: number };
    expect(body.error).toBe('Bad request');
  });

  it('returns 500 for DomainException with other codes', async () => {
    const error = DomainException.new({
      code: Code.INTERNAL_ERROR,
      overrideMessage: 'Internal',
    });
    const res = handleDomainException(error);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Internal');
  });

  it('returns 500 for generic Error', async () => {
    const res = handleDomainException(new Error('Something failed'));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Something failed');
  });

  it('returns 500 and generic message for non-Error throw', async () => {
    const res = handleDomainException('string error');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Internal server error');
  });

  it('includes data when DomainException has data', async () => {
    const error = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Not found',
      data: { notebookId: '123' },
    });
    const res = handleDomainException(error);
    const body = (await res.json()) as { error: string; data: unknown };
    expect(body.data).toEqual({ notebookId: '123' });
  });
});
