import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { datasources } from '@qwery/extensions-sdk';
import type { DriverContext, IDataSourceDriver } from '@qwery/extensions-sdk';
import { ExtensionScope, ExtensionsRegistry } from '@qwery/extensions-sdk';

import {
  getDriverInstance,
  getNodeDriverIds,
  loadExtensionSchemaForProvider,
  registerExtensionsFromFolders,
} from '../src/index';

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

    it('uses context.runtime when provided', async () => {
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
      const context: DriverContext = {
        config: {},
        runtime: 'browser',
      };

      await getDriverInstance(driverDescriptor, context);

      expect(capturedContext?.runtime).toBe('browser');
    });

    it('loads driver that exports default instead of driverFactory', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwery-default-'));
      try {
        const extDir = path.join(tempDir, 'default-driver-ext');
        fs.mkdirSync(path.join(extDir, 'dist'), { recursive: true });
        fs.writeFileSync(
          path.join(extDir, 'package.json'),
          JSON.stringify({
            contributes: {
              datasources: [
                {
                  id: 'default-driver-schema-test',
                  name: 'Default Driver',
                  drivers: ['default.driver'],
                },
              ],
              drivers: [
                {
                  id: 'default.driver',
                  name: 'Default Driver',
                  runtime: 'node',
                  entry: './dist/driver.js',
                },
              ],
            },
          }),
        );
        fs.writeFileSync(
          path.join(extDir, 'dist', 'driver.js'),
          'export default () => ({ testConnection: async () => {}, query: async () => ({ columns: [], rows: [], stat: { rowsAffected: 0, rowsRead: 0, rowsWritten: 0, queryDurationMs: null } }), metadata: async () => ({ version: "0.0.1", driver: "default.driver", schemas: [], tables: [], columns: [] }) });',
        );

        registerExtensionsFromFolders([tempDir]);

        const driverDescriptor = {
          id: 'default.driver',
          name: 'Default',
          runtime: 'node' as const,
        };
        const context: DriverContext = { config: {} };

        const instance = await getDriverInstance(driverDescriptor, context);
        expect(instance).toBeDefined();
        expect(instance.testConnection).toBeDefined();
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('throws when driver module does not export driverFactory or default function', async () => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'qwery-bad-driver-'),
      );
      try {
        const extDir = path.join(tempDir, 'bad-driver-ext');
        fs.mkdirSync(path.join(extDir, 'dist'), { recursive: true });
        fs.writeFileSync(
          path.join(extDir, 'package.json'),
          JSON.stringify({
            contributes: {
              datasources: [
                {
                  id: 'bad-driver-schema-test',
                  name: 'Bad',
                  drivers: ['bad.driver'],
                },
              ],
              drivers: [
                {
                  id: 'bad.driver',
                  name: 'Bad',
                  runtime: 'node',
                  entry: './dist/driver.js',
                },
              ],
            },
          }),
        );
        fs.writeFileSync(
          path.join(extDir, 'dist', 'driver.js'),
          'export const driverFactory = {};',
        );

        registerExtensionsFromFolders([tempDir]);

        const driverDescriptor = {
          id: 'bad.driver',
          name: 'Bad',
          runtime: 'node' as const,
        };
        const context: DriverContext = { config: {} };

        await expect(
          getDriverInstance(driverDescriptor, context),
        ).rejects.toThrow(/did not export a driverFactory or default function/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('throws when driver import fails', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwery-fail-'));
      try {
        const extDir = path.join(tempDir, 'fail-ext');
        fs.mkdirSync(extDir, { recursive: true });
        fs.writeFileSync(
          path.join(extDir, 'package.json'),
          JSON.stringify({
            contributes: {
              datasources: [
                {
                  id: 'fail-import-schema-test',
                  name: 'Fail',
                  drivers: ['fail.driver'],
                },
              ],
              drivers: [
                {
                  id: 'fail.driver',
                  name: 'Fail',
                  runtime: 'node',
                  entry: './dist/nonexistent.js',
                },
              ],
            },
          }),
        );

        registerExtensionsFromFolders([tempDir]);

        const driverDescriptor = {
          id: 'fail.driver',
          name: 'Fail',
          runtime: 'node' as const,
        };
        const context: DriverContext = { config: {} };

        await expect(
          getDriverInstance(driverDescriptor, context),
        ).rejects.toThrow(/Failed to load driver module/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('includes non-Error message when driver import throws non-Error', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwery-throw-'));
      try {
        const extDir = path.join(tempDir, 'throw-ext');
        fs.mkdirSync(path.join(extDir, 'dist'), { recursive: true });
        fs.writeFileSync(
          path.join(extDir, 'package.json'),
          JSON.stringify({
            contributes: {
              datasources: [
                {
                  id: 'throw-nonerror-schema-test',
                  name: 'Throw',
                  drivers: ['throw.driver'],
                },
              ],
              drivers: [
                {
                  id: 'throw.driver',
                  name: 'Throw',
                  runtime: 'node',
                  entry: './dist/driver.js',
                },
              ],
            },
          }),
        );
        fs.writeFileSync(
          path.join(extDir, 'dist', 'driver.js'),
          'throw "non-error string";',
        );

        registerExtensionsFromFolders([tempDir]);

        const driverDescriptor = {
          id: 'throw.driver',
          name: 'Throw',
          runtime: 'node' as const,
        };
        const context: DriverContext = { config: {} };

        await expect(
          getDriverInstance(driverDescriptor, context),
        ).rejects.toThrow(/non-error string/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('loadExtensionSchemaForProvider', () => {
    const tempDirs: string[] = [];

    afterEach(() => {
      for (const dir of tempDirs) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
      tempDirs.length = 0;
    });

    it('returns early when extension not in registry', async () => {
      await loadExtensionSchemaForProvider('nonexistent-extension-id');
      expect(
        ExtensionsRegistry.get('nonexistent-extension-id'),
      ).toBeUndefined();
    });

    it('returns early when extension has schema already', async () => {
      ExtensionsRegistry.register({
        id: 'schema-already',
        name: 'Schema Already',
        icon: '',
        scope: ExtensionScope.DATASOURCE,
        schema: { type: 'object' },
        drivers: [],
      });
      await loadExtensionSchemaForProvider('schema-already');
      const ext = ExtensionsRegistry.get('schema-already');
      expect(ext?.schema).toEqual({ type: 'object' });
    });

    it('returns early when extension has no extPath', async () => {
      ExtensionsRegistry.register({
        id: 'no-path-ext',
        name: 'No Path',
        icon: '',
        scope: ExtensionScope.DATASOURCE,
        schema: null,
        drivers: [],
      });
      await loadExtensionSchemaForProvider('no-path-ext');
      const ext = ExtensionsRegistry.get('no-path-ext');
      expect(ext?.schema).toBeNull();
    });

    it('loads schema from folder extension', async () => {
      const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwery-schema-'));
      tempDirs.push(baseDir);
      const extDir = path.join(baseDir, 'schema-ext');
      fs.mkdirSync(path.join(extDir, 'dist'), { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          contributes: {
            datasources: [
              {
                id: 'schema-load-test',
                name: 'Schema Load',
                drivers: ['schema.load.driver'],
              },
            ],
            drivers: [
              {
                id: 'schema.load.driver',
                name: 'Schema Driver',
                runtime: 'node',
                entry: './dist/driver.js',
              },
            ],
          },
        }),
      );
      fs.writeFileSync(
        path.join(extDir, 'dist', 'schema.js'),
        'export const schema = { type: "object" };',
      );
      fs.writeFileSync(
        path.join(extDir, 'dist', 'driver.js'),
        'export const driverFactory = () => ({});',
      );

      registerExtensionsFromFolders([baseDir]);
      await loadExtensionSchemaForProvider('schema-load-test');

      const ext = ExtensionsRegistry.get('schema-load-test');
      expect(ext?.schema).toEqual({ type: 'object' });
    });

    it('loads schema from default export when schema key absent', async () => {
      const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwery-schema-'));
      tempDirs.push(baseDir);
      const extDir = path.join(baseDir, 'schema-default-ext');
      fs.mkdirSync(path.join(extDir, 'dist'), { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          contributes: {
            datasources: [
              {
                id: 'schema-default-test',
                name: 'Schema Default',
                drivers: ['schema.default.driver'],
              },
            ],
            drivers: [
              {
                id: 'schema.default.driver',
                name: 'Schema Default Driver',
                runtime: 'node',
                entry: './dist/driver.js',
              },
            ],
          },
        }),
      );
      fs.writeFileSync(
        path.join(extDir, 'dist', 'schema.js'),
        'export default { type: "object", fromDefault: true };',
      );
      fs.writeFileSync(
        path.join(extDir, 'dist', 'driver.js'),
        'export const driverFactory = () => ({});',
      );

      registerExtensionsFromFolders([baseDir]);
      await loadExtensionSchemaForProvider('schema-default-test');

      const ext = ExtensionsRegistry.get('schema-default-test');
      expect(ext?.schema).toEqual({ type: 'object', fromDefault: true });
    });

    it('keeps schema null when schema exports null/undefined', async () => {
      const baseDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'qwery-schema-null-'),
      );
      tempDirs.push(baseDir);
      const extDir = path.join(baseDir, 'schema-null-ext');
      fs.mkdirSync(path.join(extDir, 'dist'), { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          contributes: {
            datasources: [
              {
                id: 'schema-null-test',
                name: 'Schema Null',
                drivers: ['schema.null.driver'],
              },
            ],
            drivers: [
              {
                id: 'schema.null.driver',
                name: 'Schema Null Driver',
                runtime: 'node',
                entry: './dist/driver.js',
              },
            ],
          },
        }),
      );
      fs.writeFileSync(
        path.join(extDir, 'dist', 'schema.js'),
        'export const schema = null; export default null;',
      );
      fs.writeFileSync(
        path.join(extDir, 'dist', 'driver.js'),
        'export const driverFactory = () => ({});',
      );

      registerExtensionsFromFolders([baseDir]);
      await loadExtensionSchemaForProvider('schema-null-test');

      const ext = ExtensionsRegistry.get('schema-null-test');
      expect(ext?.schema).toBeNull();
    });

    it('keeps schema null when schema file fails to load', async () => {
      const baseDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'qwery-schema-fail-'),
      );
      tempDirs.push(baseDir);
      const extDir = path.join(baseDir, 'schema-fail-ext');
      fs.mkdirSync(path.join(extDir, 'dist'), { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          contributes: {
            datasources: [
              {
                id: 'schema-fail-test',
                name: 'Schema Fail',
                drivers: ['schema.fail.driver'],
              },
            ],
            drivers: [
              {
                id: 'schema.fail.driver',
                name: 'Schema Fail Driver',
                runtime: 'node',
                entry: './dist/driver.js',
              },
            ],
          },
        }),
      );
      fs.writeFileSync(
        path.join(extDir, 'dist', 'driver.js'),
        'export const driverFactory = () => ({});',
      );

      registerExtensionsFromFolders([baseDir]);
      await loadExtensionSchemaForProvider('schema-fail-test');

      const ext = ExtensionsRegistry.get('schema-fail-test');
      expect(ext?.schema).toBeNull();
    });
  });

  describe('registerExtensionsFromFolders', () => {
    it('registers extensions from custom paths', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwery-reg-'));
      try {
        const extDir = path.join(tempDir, 'custom-ext');
        fs.mkdirSync(extDir, { recursive: true });
        fs.writeFileSync(
          path.join(extDir, 'package.json'),
          JSON.stringify({
            contributes: {
              datasources: [
                {
                  id: 'register-extensions-test',
                  name: 'Register Test',
                  drivers: ['register.test.driver'],
                },
              ],
              drivers: [
                {
                  id: 'register.test.driver',
                  name: 'Register Driver',
                  runtime: 'node',
                  entry: './dist/driver.js',
                },
              ],
            },
          }),
        );

        registerExtensionsFromFolders([tempDir]);

        const ext = ExtensionsRegistry.get('register-extensions-test');
        expect(ext).toBeDefined();
        expect(ext?.name).toBe('Register Test');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
