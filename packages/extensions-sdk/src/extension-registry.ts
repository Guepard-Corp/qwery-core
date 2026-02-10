import type { ExtensionDefinition } from './types';
import { ExtensionScope } from './types';

const extensions = new Map<string, ExtensionDefinition>();

export const ExtensionsRegistry = {
  register(extension: ExtensionDefinition) {
    extensions.set(extension.id, extension);
  },
  list<T extends ExtensionDefinition>(scope?: ExtensionScope): T[] {
    return Array.from(extensions.values()).filter(
      (e) => !scope || e.scope === scope,
    ) as T[];
  },
  get<T extends ExtensionDefinition>(id: string): T | undefined {
    return extensions.get(id) as unknown as T | undefined;
  },
};
