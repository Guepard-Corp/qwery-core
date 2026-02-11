import { afterEach, describe, expect, it } from 'vitest';

import { datasources } from '@qwery/extensions-sdk';
import type { DriverContext, IDataSourceDriver } from '@qwery/extensions-sdk';
import { ExtensionScope, ExtensionsRegistry } from '@qwery/extensions-sdk';

import { getDriverInstance, getNodeDriverIds } from '../src/index';

const MOCK_DRIVER_ID = 'extensions-loader.test.mock';

const disposables: Array<{ dispose: () => void }> = [];

function createMockDriver(): IDataSourceDriver {
  return {
    async testConnection() {
      return;
    },
    async query() {
      return {
        columns: [],
        rows: [],
        stat: {
          rowsAffected: 0,
          rowsRead: 0,
          rowsWritten: 0,
          queryDurationMs: null,
        },
      };
    },
    async metadata() {
      return {
        version: '0.0.1',
        driver: MOCK_DRIVER_ID,
        schemas: [],
        tables: [],
        columns: [],
      };
    },
  };
}

describe('extensions-loader', () => {
  afterEach(() => {
    for (const d of disposables) {
      d.dispose();
    }
    disposables.length = 0;
  });

  describe('getNodeDriverIds', () => {
    it('returns an array of strings', () => {
      const ids = getNodeDriverIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.every((id) => typeof id === 'string')).toBe(true);
    });

    it('returns unique driver ids', () => {
      const ids = getNodeDriverIds();
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe('ExtensionsRegistry', () => {
    it('registers datasource extensions when loader is loaded in Node', () => {
      const list = ExtensionsRegistry.list(ExtensionScope.DATASOURCE);
      expect(Array.isArray(list)).toBe(true);
      for (const ext of list) {
        expect(ext).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          scope: ExtensionScope.DATASOURCE,
          schema: null,
        });
        expect(ext.drivers).toBeDefined();
        expect(Array.isArray(ext.drivers)).toBe(true);
      }
    });
  });

  describe('getDriverInstance', () => {
    it('throws for unknown driver id', async () => {
      const unknownDriver = {
        id: 'unknown.driver.id',
        name: 'Unknown',
        runtime: 'node' as const,
      };
      const context: DriverContext = { config: {} };

      await expect(getDriverInstance(unknownDriver, context)).rejects.toThrow(
        /unknown\.driver\.id/,
      );
    });

    it('uses already-registered driver when present', async () => {
      const mock = createMockDriver();
      const factory = () => mock;
      const disposable = datasources.registerDriver(
        MOCK_DRIVER_ID,
        factory,
        'node',
      );
      disposables.push(disposable);

      const driverDescriptor = {
        id: MOCK_DRIVER_ID,
        name: 'Test Mock',
        runtime: 'node' as const,
      };
      const context: DriverContext = { config: {} };

      const instance = await getDriverInstance(driverDescriptor, context);

      expect(instance).toBe(mock);
      expect(instance.testConnection).toBeDefined();
      expect(instance.metadata).toBeDefined();
      expect(instance.query).toBeDefined();
    });

    it('passes driver context with runtime to the factory', async () => {
      let capturedContext: DriverContext | undefined;
      const factory = (ctx: DriverContext) => {
        capturedContext = ctx;
        return createMockDriver();
      };
      const disposable = datasources.registerDriver(
        MOCK_DRIVER_ID,
        factory,
        'node',
      );
      disposables.push(disposable);

      const driverDescriptor = {
        id: MOCK_DRIVER_ID,
        name: 'Test',
        runtime: 'node' as const,
      };
      const context: DriverContext = { config: { foo: 'bar' } };

      await getDriverInstance(driverDescriptor, context);

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.config).toEqual({ foo: 'bar' });
      expect(capturedContext?.runtime).toBe('node');
    });
  });
});
