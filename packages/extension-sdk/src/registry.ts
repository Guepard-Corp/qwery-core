import {
  type DatasourceDriverRegistration,
  type DatasourceExtension,
  type DriverFactory,
  type DriverRuntime,
  type ExtensionContext,
  type ExtensionDefinition,
  ExtensionScope,
} from './types';

// --- Driver registry: in-process map of driverId → factory ---

const driverRegistry = new Map<string, DatasourceDriverRegistration>();

function registerDriver(id: string, factory: DriverFactory, runtime: DriverRuntime = 'node') {
  driverRegistry.set(id, { id, factory, runtime });
  return {
    dispose: () => {
      driverRegistry.delete(id);
    },
  };
}

export const datasources = {
  registerDriver,
  getDriverRegistration(id: string): DatasourceDriverRegistration | undefined {
    return driverRegistry.get(id);
  },
  listDriverRegistrations(): DatasourceDriverRegistration[] {
    return Array.from(driverRegistry.values());
  },
};

export type DriverRegistry = Map<string, DatasourceDriverRegistration>;
export const driverRegistrations: DriverRegistry = driverRegistry;

// --- Extension definitions registry: declarative metadata for all extensions ---

const extensions = new Map<string, ExtensionDefinition>();

export const ExtensionsRegistry = {
  register(extension: ExtensionDefinition): void {
    extensions.set(extension.id, extension);
  },
  list<T extends ExtensionDefinition = ExtensionDefinition>(scope?: ExtensionScope): T[] {
    return Array.from(extensions.values()).filter((e) => !scope || e.scope === scope) as T[];
  },
  get<T extends ExtensionDefinition = ExtensionDefinition>(id: string): T | undefined {
    return extensions.get(id) as T | undefined;
  },
  listDatasources(): DatasourceExtension[] {
    return Array.from(extensions.values()).filter(
      (e) => e.scope === ExtensionScope.DATASOURCE,
    ) as DatasourceExtension[];
  },
};

export function createExtensionContext(): ExtensionContext {
  return { subscriptions: [] };
}
