import { QueryClient } from '@tanstack/react-query';

let client: QueryClient | null = null;

export function getQueryClient() {
  if (client) return client;

  client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  return client;
}

/**
 * Useful for tests or isolated re-init in dev tools.
 * Not used in app runtime paths.
 */
export function resetQueryClient() {
  client = null;
}
