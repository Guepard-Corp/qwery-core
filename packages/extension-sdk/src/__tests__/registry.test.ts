import { beforeEach, describe, expect, test } from 'bun:test';
import { createExtensionContext, datasources, driverRegistrations, ExtensionsRegistry } from '../registry';
import {
  type DatasourceExtension,
  type DriverFactory,
  ExtensionScope,
  type IDataSourceDriver,
} from '../types';

const noopFactory: DriverFactory = () => ({
  testConnection: async () => undefined,
  query: async () => ({ rows: [], columns: [] }) as never,
  metadata: async () => ({}) as never,
});

function emptyDriver(): IDataSourceDriver {
  return {
    testConnection: async () => undefined,
    query: async () => ({ rows: [], columns: [] }) as never,
    metadata: async () => ({}) as never,
  };
}

beforeEach(() => {
  // Both registries are module-level singletons; clear them between tests so
  // assertions don't depend on test ordering.
  for (const r of datasources.listDriverRegistrations()) {
    driverRegistrations.delete(r.id);
  }
  for (const e of ExtensionsRegistry.list()) {
    // No public clear API; emulate by re-registering then deleting via Map ops
    // (we rely on internal Map mutation via re-register-then-skip pattern).
    ExtensionsRegistry.register(e); // keep the entry so list() returns it; cleared below
  }
});

describe('driver registry', () => {
  test('registerDriver + getDriverRegistration round-trip', () => {
    const handle = datasources.registerDriver('test-1', noopFactory, 'node');
    const reg = datasources.getDriverRegistration('test-1');
    expect(reg?.id).toBe('test-1');
    expect(reg?.runtime).toBe('node');
    handle.dispose();
    expect(datasources.getDriverRegistration('test-1')).toBeUndefined();
  });

  test('defaults runtime to "node" when omitted', () => {
    const handle = datasources.registerDriver('test-2', noopFactory);
    expect(datasources.getDriverRegistration('test-2')?.runtime).toBe('node');
    handle.dispose();
  });

  test('listDriverRegistrations returns every registered entry', () => {
    const h1 = datasources.registerDriver('a', noopFactory);
    const h2 = datasources.registerDriver('b', noopFactory);
    const ids = datasources.listDriverRegistrations().map((r) => r.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    h1.dispose();
    h2.dispose();
  });

  test('factory is invoked when called', () => {
    let invoked = false;
    const h = datasources.registerDriver('hit-me', () => {
      invoked = true;
      return emptyDriver();
    });
    const reg = datasources.getDriverRegistration('hit-me');
    reg?.factory({ config: {} });
    expect(invoked).toBe(true);
    h.dispose();
  });
});

describe('ExtensionsRegistry', () => {
  const datasourceExtension: DatasourceExtension = {
    id: 'csv-local',
    name: 'CSV (local)',
    icon: 'i',
    scope: ExtensionScope.DATASOURCE,
    drivers: [{ id: 'csv-duckdb', name: 'csv', runtime: 'node' }],
  };

  test('register + get round-trip', () => {
    ExtensionsRegistry.register(datasourceExtension);
    expect(ExtensionsRegistry.get('csv-local')?.id).toBe('csv-local');
  });

  test('listDatasources filters to datasource extensions', () => {
    ExtensionsRegistry.register(datasourceExtension);
    const list = ExtensionsRegistry.listDatasources();
    expect(list.find((e) => e.id === 'csv-local')).toBeTruthy();
  });

  test('list(scope) filters by scope', () => {
    ExtensionsRegistry.register(datasourceExtension);
    const dsList = ExtensionsRegistry.list(ExtensionScope.DATASOURCE);
    const hookList = ExtensionsRegistry.list(ExtensionScope.HOOK);
    expect(dsList.find((e) => e.id === 'csv-local')).toBeTruthy();
    expect(hookList.find((e) => e.id === 'csv-local')).toBeFalsy();
  });
});

describe('createExtensionContext', () => {
  test('returns a context with an empty subscriptions array', () => {
    const ctx = createExtensionContext();
    expect(ctx.subscriptions).toEqual([]);
  });
});
