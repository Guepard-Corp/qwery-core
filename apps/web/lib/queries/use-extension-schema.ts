import { useQuery } from '@tanstack/react-query';

import type { z } from 'zod';

/**
 * Load the Zod schema for a datasource extension from the convention path
 * /extensions/<extensionId>/schema.js (bundled by the extensions build).
 * Returns undefined if the extension has no schema or the load fails.
 */
async function fetchExtensionSchema(
  extensionId: string,
): Promise<z.ZodTypeAny | undefined> {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : ((import.meta.env?.VITE_APP_ORIGIN as string) ?? '');
  const url = `${origin}/extensions/${extensionId}/schema.js`;

  try {
    const dynamicImport = new Function('url', 'return import(url)');
    const mod = await dynamicImport(url);
    const schema = mod.schema ?? mod.default;
    return schema as z.ZodTypeAny | undefined;
  } catch (error) {
    // Extension has no schema.js (404) or load failed; treat as no schema
    if (import.meta.env?.DEV && error instanceof Error) {
      console.warn(
        `[useExtensionSchema] Failed to load schema for ${extensionId}:`,
        error.message,
      );
    }
    return undefined;
  }
}

export function useExtensionSchema(extensionId: string) {
  return useQuery({
    queryKey: ['extension-schema', extensionId],
    queryFn: () => fetchExtensionSchema(extensionId),
    enabled: !!extensionId,
    staleTime: 5 * 60 * 1000,
  });
}
