import registryData from '@qwery/extensions-loader/registry.json';
import type { DatasourceExtension } from '@qwery/extensions-sdk';

export const DATASOURCES: DatasourceExtension[] =
  registryData.datasources as DatasourceExtension[];
