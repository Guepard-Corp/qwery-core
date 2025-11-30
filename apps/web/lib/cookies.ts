import { createCookie } from 'react-router';

export const languageCookie = createCookie('lang', {
  path: '/',
  sameSite: 'lax',
});

export const themeCookie = createCookie('theme', {
  path: '/',
  sameSite: 'lax',
});

export const layoutStyleCookie = createCookie('layout-style', {
  path: '/',
  sameSite: 'lax',
});
