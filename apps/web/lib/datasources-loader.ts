import {
  type ExtensionMetadata,
  getAllExtensionMetadata,
} from '@qwery/extensions-sdk';

/**
 * Get all datasources from plugin registry
 * This replaces the static datasources array
 */
export async function getDatasources() {
  const metadata = await getAllExtensionMetadata();
  return metadata.map((extension: ExtensionMetadata) => ({
    id: extension.id,
    name: extension.name,
    description: extension.description || '',
    logo: extension.logo,
    tags: extension.tags || [],
    scope: extension.scope,
    schema: extension.schema,
  }));
}

/**
 * Legacy export for backwards compatibility during migration
 * @deprecated Use getDatasources() instead
 */
export const datasources = [];
