/**
 * Resolves the translation file for a given language and namespace.
 *
 */
export async function i18nResolver(language: string, namespace: string) {
  try {
    const data = await import(`./locales/${language}/${namespace}.json`);

    return data as Record<string, string>;
  } catch (error) {
    console.group(
      `Error while loading translation file: ${language}/${namespace}`,
    );
    console.error(error instanceof Error ? error.message : error);
    console.warn(
      `Please create a translation file for this language at "public/locales/${language}/${namespace}.json"`,
    );
    console.groupEnd();

    // return an empty object if the file could not be loaded to avoid loops
    return {};
  }
}
