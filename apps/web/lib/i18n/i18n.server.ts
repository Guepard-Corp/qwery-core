import { z } from 'zod/v3';

import { parseAcceptLanguageHeader } from '@qwery/i18n';
import { initializeServerI18n } from '@qwery/i18n/server';

import { languageCookie } from '~/lib/cookies';
import { getI18nSettings, languages } from '~/lib/i18n/i18n.settings';

import { i18nResolver } from './i18n.resolver';

/**
 * @name createI18nServerInstance
 * @description Creates an instance of the i18n server.
 * It uses the language from the cookie if it exists, otherwise it uses the language from the accept-language header.
 * If neither is available, it will default to the provided environment variable.
 *
 * Initialize the i18n instance for every RSC server request (eg. each page/layout)
 */
async function createInstance(request: Request) {
  let cookieValue = await languageCookie.parse(request.headers.get('Cookie'));

  if (Object.keys(cookieValue ?? {}).length === 0) {
    cookieValue = undefined;
  }

  let selectedLanguage: string | undefined = undefined;

  // if the cookie is set, use the language from the cookie
  if (cookieValue) {
    selectedLanguage = getLanguageOrFallback(cookieValue);
  }

  // if not, check if the language priority is set to user and
  // use the user's preferred language
  if (!selectedLanguage) {
    const userPreferredLanguage = getPreferredLanguageFromBrowser(request);

    selectedLanguage = getLanguageOrFallback(userPreferredLanguage);
  }

  const settings = getI18nSettings(selectedLanguage);

  return initializeServerI18n(settings, i18nResolver);
}

export const createI18nServerInstance = createInstance;

function getPreferredLanguageFromBrowser(request: Request) {
  const acceptLanguage = request.headers.get('accept-language');

  if (!acceptLanguage) {
    return;
  }

  return parseAcceptLanguageHeader(acceptLanguage, languages)[0];
}

function getLanguageOrFallback(selectedLanguage: string | undefined) {
  const language = z
    .enum(languages as [string, ...string[]])
    .safeParse(selectedLanguage);

  if (language.success) {
    return language.data;
  }

  console.warn(
    `The language passed is invalid. Defaulted back to "${languages[0]}"`,
  );

  return languages[0];
}
