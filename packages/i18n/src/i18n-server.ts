import { type InitOptions, createInstance } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';

/**
 * Initialize the i18n instance on the server.
 * @param settings - the i18n settings
 * @param resolver - a function that resolves the i18n resources
 */
export async function initializeServerI18n(
  settings: InitOptions,
  resolver: (language: string, namespace: string) => Promise<object>,
) {
  const i18nInstance = createInstance();
  const loadedNamespaces = new Set<string>();

  await new Promise((resolve) => {
    void i18nInstance
      .use(
        resourcesToBackend(async (language, namespace, callback) => {
          try {
            const data = await resolver(language, namespace);
            loadedNamespaces.add(namespace);

            return callback(null, data);
          } catch (error) {
            console.log(
              `Error loading i18n file: locales/${language}/${namespace}.json`,
              error,
            );

            return callback(null, {});
          }
        }),
      )
      .use({
        type: '3rdParty',
        init: async (i18next: typeof i18nInstance) => {
          let iterations = 0;
          const maxIterations = 100;

          // do not bind this to the i18next instance until it's initialized
          while (i18next.isInitializing) {
            iterations++;

            if (iterations > maxIterations) {
              console.error(
                `i18next is not initialized after ${maxIterations} iterations`,
              );

              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 1));
          }

          initReactI18next.init(i18next);
          resolve(i18next);
        },
      })
      .init(settings);
  });

  const namespaces = settings.ns as string[];

  // If all namespaces are already loaded, return the i18n instance
  if (loadedNamespaces.size === namespaces.length) {
    return i18nInstance;
  }

  // Otherwise, wait for all namespaces to be loaded

  const maxWaitTime = 0.1; // 100 milliseconds
  const checkIntervalMs = 5; // 5 milliseconds

  async function waitForNamespaces() {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const allNamespacesLoaded = namespaces.every((ns) =>
        loadedNamespaces.has(ns),
      );

      if (allNamespacesLoaded) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
    }

    return false;
  }

  const success = await waitForNamespaces();

  if (!success) {
    console.warn(
      `Not all namespaces were loaded after ${maxWaitTime}ms. Initialization may be incomplete.`,
    );
  }

  return i18nInstance;
}
