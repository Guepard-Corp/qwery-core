import { csrfCookie } from './csrf.cookie';

/**
 * @name getCsrfTokenCookie
 * @param cookieHeader
 */
export function getCsrfTokenCookie(cookieHeader: string) {
  return csrfCookie.parse(cookieHeader);
}

/**
 * @name setCsrfTokenCookie
 * @param value
 */
export function setCsrfTokenCookie(value: string) {
  return csrfCookie.serialize(value);
}
