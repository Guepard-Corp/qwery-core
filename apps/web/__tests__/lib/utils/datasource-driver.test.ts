import { describe, expect, it } from 'vitest';

import type { Datasource } from '@qwery/domain/entities';
import {
  ExtensionScope,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';

import { resolveDatasourceDriver } from '~/lib/utils/datasource-driver';

const extension = {
  id: 'postgresql',
  name: 'PostgreSQL',
  icon: 'postgres.svg',
  scope: ExtensionScope.DATASOURCE,
  drivers: [
    {
      id: 'postgresql.default',
      name: 'PostgreSQL (Node)',
      runtime: 'node',
    },
    {
      id: 'postgresql.browser',
      name: 'PostgreSQL (Browser)',
      runtime: 'browser',
    },
  ],
} as const satisfies DatasourceExtension;

describe('resolveDatasourceDriver', () => {
  it('prefers persisted datasource_driver over config.driverId', () => {
    const driver = resolveDatasourceDriver(extension, {
      datasource_driver: 'postgresql.default',
      config: { driverId: 'postgresql.browser' },
    });

    expect(driver?.id).toBe('postgresql.default');
  });

  it('falls back to config.driverId for legacy records', () => {
    const driver = resolveDatasourceDriver(extension, {
      config: { driverId: 'postgresql.browser' },
    });

    expect(driver?.id).toBe('postgresql.browser');
  });

  it('falls back to the extension default driver when neither is present', () => {
    const driver = resolveDatasourceDriver(extension, {
      config: {},
    });

    expect(driver?.id).toBe('postgresql.default');
  });

  it('ignores invalid persisted driver ids and still resolves from config', () => {
    const datasource = {
      datasource_driver: 'postgresql-neon',
      config: { driverId: 'postgresql.browser' },
    } as Partial<Datasource> as Datasource;

    const driver = resolveDatasourceDriver(extension, datasource);

    expect(driver?.id).toBe('postgresql.browser');
  });
});
