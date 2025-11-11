import { atou, createSecret, createToken, utoa } from '@edge-csrf/core';

import { getCsrfTokenCookie, setCsrfTokenCookie } from './csrf-token-cookies';

type TokenValueFunction = (request: Request) => Promise<string>;

/**
 * Represents a generic CSRF protection error
 */
export class CsrfError extends Error {}

/**
 * Represents token options in config
 */
export class TokenOptions {
  value: TokenValueFunction | undefined = undefined;

  constructor(opts?: Partial<TokenOptions>) {
    Object.assign(this, opts);
  }
}

/**
 * Represents CsrfProtect configuration object
 */
export class Config {
  excludePathPrefixes: string[] = [];
  saltByteLength = 8;
  secretByteLength = 18;
  token: TokenOptions = new TokenOptions();

  constructor() {
    // basic validation
    if (this.saltByteLength < 1 || this.saltByteLength > 255) {
      throw Error('saltBytLength must be greater than 0 and less than 256');
    }

    if (this.secretByteLength < 1 || this.secretByteLength > 255) {
      throw Error('secretBytLength must be greater than 0 and less than 256');
    }
  }
}

/**
 * @name createCsrfProtect
 * @description Create CSRF protect function
 * @param opts
 */
export function createCsrfProtect() {
  const config = new Config();

  return async (request: Request) => {
    const cookieHeader = request.headers.get('Cookie') ?? '';

    // get secret from cookies
    const secretStr = await getCsrfTokenCookie(cookieHeader);

    let secret: Uint8Array;

    // if secret is missing, create new secret and set cookie
    if (!secretStr) {
      secret = createSecret(config.secretByteLength);

      const base64Secret = utoa(secret);
      const serializedCookie = await setCsrfTokenCookie(base64Secret);

      request.headers.set('Set-Cookie', serializedCookie);
    } else {
      secret = atou(secretStr);
    }

    // create new token for response
    const newToken = await createToken(secret, config.saltByteLength);

    return utoa(newToken);
  };
}
