import type {
  DatasourceDriverRegistration,
  DriverFactory,
  DriverRuntime,
  ExtensionContext,
} from './types';

const driverRegistry = new Map<string, DatasourceDriverRegistration>();

function registerDriver(
  id: string,
  factory: DriverFactory,
  runtime: DriverRuntime = 'node',
) {
  driverRegistry.set(id, { id, factory, runtime });
  return {
    dispose: () => {
      driverRegistry.delete(id);
    },
  };
}

export const datasources = {
  registerDriver,
  getDriverRegistration(id: string) {
    return driverRegistry.get(id);
  },
  listDriverRegistrations() {
    return Array.from(driverRegistry.values());
  },
};

export function getDiscoveredDatasources(): Array<{
  id: string;
  name: string;
}> {
  return Array.from(driverRegistry.values()).map((r) => ({
    id: r.id,
    name: r.id,
  }));
}

export function createExtensionContext(): ExtensionContext {
  return {
    subscriptions: [],
  };
}

export type DriverRegistry = Map<string, DatasourceDriverRegistration>;
export const driverRegistrations: DriverRegistry = driverRegistry;
