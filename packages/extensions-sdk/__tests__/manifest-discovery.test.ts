import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ExtensionScope,
  ExtensionsRegistry,
  type DatasourceExtension,
} from '../src/index';

describe('ExtensionsRegistry', () => {
  const MOCK_EXTENSION: DatasourceExtension = {
    id: 'postgresql',
    name: 'PostgreSQL',
    icon: 'media/postgresql.png',
    description: '',
    scope: ExtensionScope.DATASOURCE,
    schema: {},
    drivers: [
      {
        id: 'postgresql.default',
        name: 'PostgreSQL',
        runtime: 'node',
      },
    ],
  };

  beforeEach(() => {
    ExtensionsRegistry.register(MOCK_EXTENSION);
  });

  afterEach(() => {
    // Registry has no unregister; same extension re-registered overwrites by id
    ExtensionsRegistry.register(MOCK_EXTENSION);
  });

  it('returns registered datasource via get', () => {
    const ds = ExtensionsRegistry.get<DatasourceExtension>('postgresql');
    expect(ds).toBeDefined();
    expect(ds?.drivers[0]?.id).toBe('postgresql.default');
  });

  it('lists datasource extensions by scope', () => {
    const list = ExtensionsRegistry.list<DatasourceExtension>(
      ExtensionScope.DATASOURCE,
    );
    expect(list.length).toBeGreaterThan(0);
    const postgres = list.find((e) => e.id === 'postgresql');
    expect(postgres?.drivers[0]?.id).toBe('postgresql.default');
  });
});
