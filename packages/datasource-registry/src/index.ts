import registryData from './registry.json';

export interface DatasourceRegistryEntry {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  schema: Record<string, unknown>;
  packageName?: string;
  drivers: Array<{
    id: string;
    name: string;
    description?: string;
    runtime?: string;
    entry?: string;
  }>;
  formConfig?: Record<string, unknown> | null;
}

export interface DatasourceRegistry {
  datasources: DatasourceRegistryEntry[];
}

const registry = registryData as DatasourceRegistry;

export function getDatasourceTypes(): DatasourceRegistryEntry[] {
  return registry.datasources;
}

export function getDatasourceTypeById(
  id: string,
): DatasourceRegistryEntry | undefined {
  return registry.datasources.find((d) => d.id === id);
}

export { registry };
