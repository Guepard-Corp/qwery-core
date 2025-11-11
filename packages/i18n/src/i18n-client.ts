import i18next, { type InitOptions, i18n } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

// Keep track of the number of iterations
let iteration = 0;

// Maximum number of iterations
const MAX_ITERATIONS = 20;

/**
 * Initialize the i18n instance on the client.
 * @param settings - the i18n settings
 * @param resolver - a function that resolves the i18n resources
 */
export async function initializeI18nClient(
  settings: InitOptions,
  resolver: (lang: string, namespace: string) => Promise<object>,
): Promise<i18n> {
  const loadedNamespaces = new Set<string>();

  await new Promise((resolve) => {
    void i18next
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
        init: async (instance: typeof i18next) => {
          let iterations = 0;
          const maxIterations = 100;

          // do not bind this to the i18next instance until it's initialized
          while (instance.isInitializing) {
            iterations++;

            if (iterations > maxIterations) {
              console.error(
                `i18next is not initialized after ${maxIterations} iterations`,
              );

              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 1));
          }

          initReactI18next.init(instance);
          resolve(instance);
        },
      })
      .init(settings);
  });

  // to avoid infinite loops, we return the i18next instance after a certain number of iterations
  // even if the languages and namespaces are not loaded
  if (iteration >= MAX_ITERATIONS) {
    console.debug(`Max iterations reached: ${MAX_ITERATIONS}`);

    return i18next;
  }

  // keep component from rendering if no languages or namespaces are loaded
  if (loadedNamespaces.size === 0) {
    iteration++;

    console.debug(
      `Keeping component from rendering if no languages or namespaces are loaded. Iteration: ${iteration}. Will stop after ${MAX_ITERATIONS} iterations.`,
    );

    throw new Error('No languages or namespaces loaded');
  }

  return i18next;
}
