import { createCookie } from 'react-router';

import process from 'node:process';

export const csrfCookie = createCookie('_csrfSecret', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
});
