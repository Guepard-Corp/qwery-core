import { z } from 'zod/v3';

import registry from '../../extensions-loader/src/registry.json';

import { jsonSchemaToZod, type JsonSchema } from './json-schema-to-zod';
import { ExtensionScope, type DriverRuntime } from './types';

export interface DiscoveredDriver {
  id: string;
  name: string;
  description?: string;
  runtime: DriverRuntime;
  entry?: string;
  packageDir: string;
  packageName?: string;
}

export interface DiscoveredDatasource {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  schema: z.ZodTypeAny;
  rawSchema: JsonSchema;
  drivers: DiscoveredDriver[];
  packageDir: string;
  packageName: string;
  scope: ExtensionScope;
}

export interface DiscoveredExtensionPackage {
  packageName: string;
  packageDir: string;
  datasources: DiscoveredDatasource[];
  drivers: DiscoveredDriver[];
}

let discoveryCache: DiscoveredExtensionPackage[] | null = null;

type RegistryPayload = {
  datasources: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    schema: JsonSchema;
    packageName: string;
    drivers: Array<{
      id: string;
      name: string;
      description?: string;
      runtime?: DriverRuntime;
      entry?: string;
    }>;
  }>;
};

function transformRegistryToDiscovered(
  payload: RegistryPayload,
): DiscoveredExtensionPackage[] {
  const datasources: DiscoveredDatasource[] = payload.datasources.map((ds) => {
    const drivers: DiscoveredDriver[] = ds.drivers.map((driver) => ({
      id: driver.id,
      name: driver.name,
      description: driver.description,
      runtime: driver.runtime ?? 'node',
      entry: driver.entry,
      packageDir: '', // Empty - we'll use packageName for resolution
      packageName: ds.packageName,
    }));

    return {
      id: ds.id,
      name: ds.name,
      description: ds.description,
      icon: ds.icon,
      rawSchema: ds.schema,
      schema: jsonSchemaToZod(ds.schema),
      drivers,
      packageDir: '', // Empty - not needed
      packageName: ds.packageName,
      scope: ExtensionScope.DATASOURCE,
    };
  });

  return [
    {
      packageName: 'registry',
      packageDir: '',
      datasources,
      drivers: datasources.flatMap((d) => d.drivers),
    },
  ];
}

export async function discoverExtensions(): Promise<
  DiscoveredExtensionPackage[]
> {
  if (discoveryCache) return discoveryCache;

  // Transform imported registry to DiscoveredExtensionPackage[]
  discoveryCache = transformRegistryToDiscovered(
    registry as unknown as RegistryPayload,
  );
  return discoveryCache;
}

export async function getDiscoveredDatasource(
  datasourceId: string,
): Promise<DiscoveredDatasource | undefined> {
  const all = await discoverExtensions();
  for (const ext of all) {
    const found = ext.datasources.find((ds) => ds.id === datasourceId);
    if (found) return found;
  }
  return undefined;
}

export async function getDiscoveredDatasources(): Promise<
  DiscoveredDatasource[]
> {
  const all = await discoverExtensions();
  return all.flatMap((pkg) => pkg.datasources);
}
