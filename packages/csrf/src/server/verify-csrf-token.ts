import { atou, createSecret, utoa, verifyToken } from '@edge-csrf/core';

import { getCsrfTokenCookie, setCsrfTokenCookie } from './csrf-token-cookies';

/**
 * @name verifyCsrfToken
 * @description Verify CSRF token
 * @param request
 * @param token
 * @param config
 */
export async function verifyCsrfToken(
  request: Request,
  token: string,
  config?: {
    secretByteLength: number;
  },
) {
  const cookieHeader = request.headers.get('Cookie') ?? '';

  let secretStr = (await getCsrfTokenCookie(cookieHeader)) ?? '';

  if (!secretStr) {
    const secret = createSecret(config?.secretByteLength ?? 18);
    secretStr = utoa(secret);
    const serializedCookie = await setCsrfTokenCookie(secretStr);

    request.headers.set('Set-Cookie', serializedCookie);
  }

  const verified = await verifyToken(atou(token), atou(secretStr));

  if (!verified) {
    console.error(`Invalid CSRF token`);

    throw new Response(
      JSON.stringify({
        success: false,
        error: `Invalid CSRF token`,
      }),
    );
  }
}
