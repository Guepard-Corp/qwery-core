import { describe, expect, it } from 'vitest';
import {
  getErrorCategory,
  getErrorCategoryFromStatus,
  ERROR_CODES,
} from '../src/error';

describe('getErrorCategory', () => {
  it('returns notFound for codes in 2000-2999 range', () => {
    expect(getErrorCategory(ERROR_CODES.NOTEBOOK_NOT_FOUND)).toBe('notFound');
    expect(getErrorCategory(ERROR_CODES.USER_NOT_FOUND)).toBe('notFound');
    expect(getErrorCategory(2999)).toBe('notFound');
  });

  it('returns permissionDenied for 401 and 403', () => {
    expect(getErrorCategory(401)).toBe('permissionDenied');
    expect(getErrorCategory(403)).toBe('permissionDenied');
  });

  it('returns generic for other 4xx codes', () => {
    expect(getErrorCategory(ERROR_CODES.BAD_REQUEST)).toBe('generic');
    expect(getErrorCategory(402)).toBe('generic');
    expect(getErrorCategory(404)).toBe('generic');
    expect(getErrorCategory(499)).toBe('generic');
  });

  it('returns generic for other codes', () => {
    expect(getErrorCategory(ERROR_CODES.INTERNAL_ERROR)).toBe('generic');
    expect(getErrorCategory(1000)).toBe('generic');
    expect(getErrorCategory(5000)).toBe('generic');
  });
});

describe('getErrorCategoryFromStatus', () => {
  it('returns permissionDenied for 401 and 403', () => {
    expect(getErrorCategoryFromStatus(401)).toBe('permissionDenied');
    expect(getErrorCategoryFromStatus(403)).toBe('permissionDenied');
  });

  it('returns notFound for 404', () => {
    expect(getErrorCategoryFromStatus(404)).toBe('notFound');
  });

  it('returns network for 502, 503, 504, and 0', () => {
    expect(getErrorCategoryFromStatus(502)).toBe('network');
    expect(getErrorCategoryFromStatus(503)).toBe('network');
    expect(getErrorCategoryFromStatus(504)).toBe('network');
    expect(getErrorCategoryFromStatus(0)).toBe('network');
  });

  it('returns generic for other status codes', () => {
    expect(getErrorCategoryFromStatus(400)).toBe('generic');
    expect(getErrorCategoryFromStatus(500)).toBe('generic');
    expect(getErrorCategoryFromStatus(200)).toBe('generic');
  });
});
