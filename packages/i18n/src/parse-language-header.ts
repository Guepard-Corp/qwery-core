/**
 * Parse the accept-language header value and return the languages that are included in the accepted languages.
 * @param languageHeaderValue
 * @param acceptedLanguages
 */
export function parseAcceptLanguageHeader(
  languageHeaderValue: string | null | undefined,
  acceptedLanguages: string[],
): string[] {
  // Return an empty array if the header value is not provided
  if (!languageHeaderValue) return [];

  const ignoreWildcard = true;

  // Split the header value by comma and map each language to its quality value
  return languageHeaderValue
    .split(',')
    .map((lang): [number, string] => {
      const [locale, q = 'q=1'] = lang.split(';');

      if (!locale) return [0, ''];

      const trimmedLocale = locale.trim();
      const numQ = Number(q.replace(/q ?=/, ''));

      return [isNaN(numQ) ? 0 : numQ, trimmedLocale];
    })
    .sort(([q1], [q2]) => q2 - q1) // Sort by quality value in descending order
    .flatMap(([_, locale]) => {
      // Ignore wildcard '*' if 'ignoreWildcard' is true
      if (locale === '*' && ignoreWildcard) return [];

      const languageSegment = locale.split('-')[0];

      if (!languageSegment) return [];

      // Return the locale if it's included in the accepted languages
      try {
        return acceptedLanguages.includes(languageSegment)
          ? [languageSegment]
          : [];
      } catch {
        return [];
      }
    });
}
