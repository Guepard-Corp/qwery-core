import type { Datasource } from '@qwery/domain/entities';
import type { DatasourceDriver } from '@qwery/extensions-sdk';
import { getExtension } from '@qwery/extensions-sdk';

export async function createDriverFromExtension(
  providerId: string,
  name: string,
  config: Record<string, unknown>,
): Promise<DatasourceDriver> {
  const extension = await getExtension(providerId);
  if (!extension) {
    throw new Error(
      `Datasource provider "${providerId}" is not registered in the CLI runtime.`,
    );
  }

  return extension.getDriver(name, config as never);
}

export async function createDriverForDatasource(
  datasource: Datasource,
): Promise<DatasourceDriver> {
  const config =
    (datasource.config as Record<string, unknown> | undefined) ?? {};
  return createDriverFromExtension(
    datasource.datasource_provider,
    datasource.name,
    config,
  );
}
