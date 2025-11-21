import type { DatasourceExtension, ExtensionMetadata } from './types';
import { ExtensionScope } from './types';

// Store all registered extensions
const extensions = new Map<string, DatasourceExtension>();

/**
 * Register a extension in the static registry
 * This is called by individual extension modules
 */
export function registerExtension(extension: DatasourceExtension): void {
  extensions.set(extension.id, extension);
}

/**
 * Get a extension by its ID
 */
export async function getExtension(
  id: string,
): Promise<DatasourceExtension | undefined> {
  await loadExtensions();
  return extensions.get(id);
}

/**
 * Get all extensions
 */
export async function getAllExtensions(): Promise<DatasourceExtension[]> {
  await loadExtensions();
  return Array.from(extensions.values());
}

/**
 * Get extension metadata (for listing without full extension)
 */
export async function getExtensionMetadata(
  id: string,
): Promise<ExtensionMetadata | undefined> {
  const extension = await getExtension(id);
  if (!extension) return undefined;

  return {
    id: extension.id,
    name: extension.name,
    logo: extension.logo,
    description: extension.description,
    tags: extension.tags,
    scope: extension.scope ?? ExtensionScope.DATASOURCE,
    schema: extension.schema,
  };
}

/**
 * Get all extension metadata (for listing page)
 */
export async function getAllExtensionMetadata(): Promise<ExtensionMetadata[]> {
  const allExtensions = await getAllExtensions();
  return allExtensions.map((extension) => ({
    id: extension.id,
    name: extension.name,
    logo: extension.logo,
    description: extension.description,
    tags: extension.tags,
    scope: extension.scope ?? ExtensionScope.DATASOURCE,
    schema: extension.schema,
  }));
}

// Lazy load extensions to avoid hoisting issues
let extensionsLoaded = false;

async function loadExtensions(): Promise<void> {
  if (extensionsLoaded) return;

  await Promise.all([
    import('../../features/playground/src/factory/impl/pglite-playground'),
  ]);

  extensionsLoaded = true;
}
