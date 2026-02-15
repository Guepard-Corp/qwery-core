import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExtensionScope, ExtensionsRegistry } from '@qwery/extensions-sdk';

import {
  discoverExtensionsFromFolders,
  getDefaultExtensionPaths,
  resolveDriverEntryPath,
  resolveSchemaPath,
} from '../src/discovery';
import { registerExtensionsFromFolders } from '../src/index';

describe('discovery', () => {
  describe('getDefaultExtensionPaths', () => {
    it('returns user path for all platforms', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      delete process.env.QWERY_EXTENSIONS_PATH;
      try {
        const paths = getDefaultExtensionPaths();
        const userPath = path.join(os.homedir(), '.qwery', 'extensions');
        expect(paths).toContain(userPath);
      } finally {
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        }
      }
    });

    it('returns at least user path and platform-specific paths on known platforms', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      delete process.env.QWERY_EXTENSIONS_PATH;
      try {
        const paths = getDefaultExtensionPaths();
        const userPath = path.join(os.homedir(), '.qwery', 'extensions');
        expect(paths).toContain(userPath);
        expect(paths[paths.length - 1]).toBe(userPath);

        if (process.platform === 'darwin') {
          expect(paths).toContain(
            '/Applications/Qwery.app/Contents/Resources/extensions',
          );
        }
        if (process.platform === 'win32') {
          const programFiles = process.env.PROGRAMFILES ?? 'C:\\Program Files';
          expect(paths).toContain(
            path.join(programFiles, 'Qwery', 'resources', 'extensions'),
          );
        }
        if (process.platform === 'linux') {
          expect(paths).toContain('/usr/lib/qwery/extensions');
        }
      } finally {
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        }
      }
    });

    it('uses QWERY_EXTENSIONS_PATH when set, instead of automatic resolution', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      process.env.QWERY_EXTENSIONS_PATH = '/custom/path';
      try {
        const paths = getDefaultExtensionPaths();
        expect(paths).toEqual(['/custom/path']);
      } finally {
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        } else {
          delete process.env.QWERY_EXTENSIONS_PATH;
        }
      }
    });

    it('supports multiple paths in QWERY_EXTENSIONS_PATH (comma or semicolon)', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      process.env.QWERY_EXTENSIONS_PATH = '/path1,/path2;/path3';
      try {
        const paths = getDefaultExtensionPaths();
        expect(paths).toEqual(['/path1', '/path2', '/path3']);
      } finally {
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        } else {
          delete process.env.QWERY_EXTENSIONS_PATH;
        }
      }
    });

    it('returns win32 paths when platform is win32 with env vars set', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      const originalPlatform = process.platform;
      delete process.env.QWERY_EXTENSIONS_PATH;
      process.env.PROGRAMFILES = 'D:\\Programs';
      process.env['PROGRAMFILES(X86)'] = 'D:\\Programs (x86)';
      process.env.LOCALAPPDATA = 'D:\\Users\\test\\AppData\\Local';
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
        writable: true,
      });
      try {
        const paths = getDefaultExtensionPaths();
        expect(paths).toContain(
          path.join('D:\\Programs', 'Qwery', 'resources', 'extensions'),
        );
        expect(paths).toContain(
          path.join('D:\\Programs (x86)', 'Qwery', 'resources', 'extensions'),
        );
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
          writable: true,
        });
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        }
      }
    });

    it('returns win32 paths when PROGRAMFILES set but PROGRAMFILES(X86) unset', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      const originalPlatform = process.platform;
      const originalProgramFiles = process.env.PROGRAMFILES;
      const originalProgramFilesX86 = process.env['PROGRAMFILES(X86)'];
      delete process.env.QWERY_EXTENSIONS_PATH;
      process.env.PROGRAMFILES = 'E:\\Programs';
      delete process.env['PROGRAMFILES(X86)'];
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
        writable: true,
      });
      try {
        const paths = getDefaultExtensionPaths();
        expect(paths).toContain(
          path.join('E:\\Programs', 'Qwery', 'resources', 'extensions'),
        );
        expect(paths).toContain(
          path.join(
            'C:\\Program Files (x86)',
            'Qwery',
            'resources',
            'extensions',
          ),
        );
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
          writable: true,
        });
        if (originalProgramFiles !== undefined) {
          process.env.PROGRAMFILES = originalProgramFiles;
        }
        if (originalProgramFilesX86 !== undefined) {
          process.env['PROGRAMFILES(X86)'] = originalProgramFilesX86;
        }
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        }
      }
    });

    it('returns win32 paths when platform is win32 with env vars unset', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      const originalPlatform = process.platform;
      const originalProgramFiles = process.env.PROGRAMFILES;
      const originalProgramFilesX86 = process.env['PROGRAMFILES(X86)'];
      const originalLocalAppData = process.env.LOCALAPPDATA;
      delete process.env.QWERY_EXTENSIONS_PATH;
      delete process.env.PROGRAMFILES;
      delete process.env['PROGRAMFILES(X86)'];
      delete process.env.LOCALAPPDATA;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
        writable: true,
      });
      try {
        const paths = getDefaultExtensionPaths();
        expect(paths).toContain(
          path.join('C:\\Program Files', 'Qwery', 'resources', 'extensions'),
        );
        expect(paths).toContain(
          path.join(
            'C:\\Program Files (x86)',
            'Qwery',
            'resources',
            'extensions',
          ),
        );
        expect(paths).toContain(
          path.join(
            os.homedir(),
            'AppData',
            'Local',
            'Programs',
            'Qwery',
            'resources',
            'extensions',
          ),
        );
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
          writable: true,
        });
        if (originalProgramFiles !== undefined) {
          process.env.PROGRAMFILES = originalProgramFiles;
        }
        if (originalProgramFilesX86 !== undefined) {
          process.env['PROGRAMFILES(X86)'] = originalProgramFilesX86;
        }
        if (originalLocalAppData !== undefined) {
          process.env.LOCALAPPDATA = originalLocalAppData;
        }
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        }
      }
    });

    it('returns linux paths when platform is linux with APPDIR', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      const originalPlatform = process.platform;
      const originalAppDir = process.env.APPDIR;
      delete process.env.QWERY_EXTENSIONS_PATH;
      process.env.APPDIR = '/app';
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
        writable: true,
      });
      try {
        const paths = getDefaultExtensionPaths();
        expect(paths).toContain('/usr/lib/qwery/extensions');
        expect(paths).toContain(
          path.join('/app', 'usr', 'lib', 'qwery', 'extensions'),
        );
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
          writable: true,
        });
        if (originalAppDir !== undefined) {
          process.env.APPDIR = originalAppDir;
        } else {
          delete process.env.APPDIR;
        }
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        }
      }
    });

    it('returns linux paths when platform is linux without APPDIR', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      const originalPlatform = process.platform;
      const originalAppDir = process.env.APPDIR;
      delete process.env.QWERY_EXTENSIONS_PATH;
      delete process.env.APPDIR;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
        writable: true,
      });
      try {
        const paths = getDefaultExtensionPaths();
        expect(paths).toContain('/usr/lib/qwery/extensions');
        expect(paths).not.toContain(
          path.join('/app', 'usr', 'lib', 'qwery', 'extensions'),
        );
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
          writable: true,
        });
        if (originalAppDir !== undefined) {
          process.env.APPDIR = originalAppDir;
        }
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        }
      }
    });

    it('returns only user path for unknown platform', () => {
      const original = process.env.QWERY_EXTENSIONS_PATH;
      const originalPlatform = process.platform;
      delete process.env.QWERY_EXTENSIONS_PATH;
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        configurable: true,
        writable: true,
      });
      try {
        const paths = getDefaultExtensionPaths();
        expect(paths).toEqual([
          path.join(os.homedir(), '.qwery', 'extensions'),
        ]);
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
          writable: true,
        });
        if (original !== undefined) {
          process.env.QWERY_EXTENSIONS_PATH = original;
        }
      }
    });
  });

  describe('resolveDriverEntryPath', () => {
    it('uses entry when provided', () => {
      const href = resolveDriverEntryPath(
        '/ext',
        './dist/driver.js',
        undefined,
      );
      expect(href).toMatch(/dist\/driver\.js$/);
    });

    it('uses pkgMain when entry is undefined', () => {
      const href = resolveDriverEntryPath('/ext', undefined, './lib/main.js');
      expect(href).toMatch(/lib\/main\.js$/);
    });

    it('uses default when entry and pkgMain are undefined', () => {
      const href = resolveDriverEntryPath('/ext', undefined, undefined);
      expect(href).toMatch(/dist\/driver\.js$/);
    });

    it('uses bun export when running under Bun and pkg has exports["."].bun', () => {
      vi.stubGlobal('Bun', {});
      try {
        const href = resolveDriverEntryPath(
          '/ext',
          './dist/driver.js',
          undefined,
          { exports: { '.': { bun: './src/driver.ts' } } },
        );
        expect(href).toMatch(/src\/driver\.ts$/);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('uses entry when Bun is set but pkg has no bun export', () => {
      vi.stubGlobal('Bun', {});
      try {
        const href = resolveDriverEntryPath(
          '/ext',
          './dist/driver.js',
          undefined,
          { exports: { '.': { default: './dist/driver.js' } } },
        );
        expect(href).toMatch(/dist\/driver\.js$/);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('uses entry when Bun is set but pkg is undefined', () => {
      vi.stubGlobal('Bun', {});
      try {
        const href = resolveDriverEntryPath('/ext', './dist/driver.js');
        expect(href).toMatch(/dist\/driver\.js$/);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('resolveSchemaPath', () => {
    it('returns file URL for dist/schema.js', () => {
      const href = resolveSchemaPath('/ext/dir');
      expect(href).toMatch(/dist\/schema\.js$/);
      expect(href).toMatch(/^file:/);
    });
  });

  describe('discoverExtensionsFromFolders', () => {
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

    function createTempDir(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwery-ext-'));
      tempDirs.push(dir);
      return dir;
    }

    it('discovers extension from folder with valid package.json', () => {
      const baseDir = createTempDir();
      const extDir = path.join(baseDir, 'my-extension');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          name: '@qwery/extension-my',
          contributes: {
            datasources: [
              {
                id: 'my-datasource',
                name: 'My Datasource',
                drivers: ['my.driver'],
              },
            ],
            drivers: [
              {
                id: 'my.driver',
                name: 'My Driver',
                runtime: 'node',
                entry: './dist/driver.js',
              },
            ],
          },
        }),
      );

      const discovered = discoverExtensionsFromFolders([baseDir]);

      expect(discovered).toHaveLength(1);
      expect(discovered[0]).toMatchObject({
        extDir,
        datasources: [
          {
            id: 'my-datasource',
            name: 'My Datasource',
            drivers: ['my.driver'],
          },
        ],
        drivers: [
          {
            id: 'my.driver',
            name: 'My Driver',
            runtime: 'node',
            entry: './dist/driver.js',
          },
        ],
      });
    });

    it('deduplicates by datasource id - first wins', () => {
      const baseDir = createTempDir();
      const ext1Dir = path.join(baseDir, 'ext1');
      const ext2Dir = path.join(baseDir, 'ext2');
      fs.mkdirSync(ext1Dir, { recursive: true });
      fs.mkdirSync(ext2Dir, { recursive: true });

      const pkg1 = {
        contributes: {
          datasources: [{ id: 'same-id', name: 'First', drivers: [] }],
          drivers: [] as unknown[],
        },
      };
      const pkg2 = {
        contributes: {
          datasources: [{ id: 'same-id', name: 'Second', drivers: [] }],
          drivers: [] as unknown[],
        },
      };

      fs.writeFileSync(
        path.join(ext1Dir, 'package.json'),
        JSON.stringify(pkg1),
      );
      fs.writeFileSync(
        path.join(ext2Dir, 'package.json'),
        JSON.stringify(pkg2),
      );

      const discovered = discoverExtensionsFromFolders([baseDir]);

      expect(discovered).toHaveLength(1);
      expect(discovered[0].datasources[0].name).toBe('First');
    });

    it('skips non-existent path', () => {
      const discovered = discoverExtensionsFromFolders([
        '/non/existent/path/12345',
      ]);
      expect(discovered).toHaveLength(0);
    });

    it('skips folder without package.json', () => {
      const baseDir = createTempDir();
      const extDir = path.join(baseDir, 'no-pkg');
      fs.mkdirSync(extDir, { recursive: true });

      const discovered = discoverExtensionsFromFolders([baseDir]);

      expect(discovered).toHaveLength(0);
    });

    it('skips folder with invalid JSON in package.json', () => {
      const baseDir = createTempDir();
      const extDir = path.join(baseDir, 'bad-json');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(path.join(extDir, 'package.json'), 'not valid json {');

      const discovered = discoverExtensionsFromFolders([baseDir]);

      expect(discovered).toHaveLength(0);
    });

    it('skips extension with empty datasources', () => {
      const baseDir = createTempDir();
      const extDir = path.join(baseDir, 'empty-ext');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          contributes: { datasources: [], drivers: [] },
        }),
      );

      const discovered = discoverExtensionsFromFolders([baseDir]);

      expect(discovered).toHaveLength(0);
    });

    it('skips path when readdirSync throws', () => {
      const baseDir = createTempDir();
      const readdirSpy = vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });
      try {
        const discovered = discoverExtensionsFromFolders([baseDir]);
        expect(discovered).toHaveLength(0);
      } finally {
        readdirSpy.mockRestore();
      }
    });

    it('uses explicit basePaths when provided', () => {
      const discovered = discoverExtensionsFromFolders(['/nonexistent']);
      expect(discovered).toHaveLength(0);
    });

    it('filters duplicate datasource ids within same package', () => {
      const baseDir = createTempDir();
      const extDir = path.join(baseDir, 'dup-ds');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          contributes: {
            datasources: [
              { id: 'dup-id', name: 'First', drivers: [] },
              { id: 'dup-id', name: 'Second', drivers: [] },
            ],
            drivers: [],
          },
        }),
      );

      const discovered = discoverExtensionsFromFolders([baseDir]);

      expect(discovered).toHaveLength(1);
      expect(discovered[0].datasources).toHaveLength(1);
      expect(discovered[0].datasources[0]?.name).toBe('First');
    });

    it('includes multiple datasources from same package when ids differ', () => {
      const baseDir = createTempDir();
      const extDir = path.join(baseDir, 'multi-ds');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          contributes: {
            datasources: [
              { id: 'ds-a', name: 'DS A', drivers: [] },
              { id: 'ds-b', name: 'DS B', drivers: [] },
            ],
            drivers: [],
          },
        }),
      );

      const discovered = discoverExtensionsFromFolders([baseDir]);

      expect(discovered).toHaveLength(1);
      expect(discovered[0].datasources).toHaveLength(2);
      expect(discovered[0].datasources.map((d) => d.id)).toEqual([
        'ds-a',
        'ds-b',
      ]);
    });
  });

  describe('registerExtensionsFromFolders', () => {
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

    function createTempDir(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwery-ext-'));
      tempDirs.push(dir);
      return dir;
    }

    it('registers discovered extension in ExtensionsRegistry', () => {
      const baseDir = createTempDir();
      const extDir = path.join(baseDir, 'reg-ext');
      fs.mkdirSync(extDir, { recursive: true });
      fs.writeFileSync(
        path.join(extDir, 'package.json'),
        JSON.stringify({
          name: '@qwery/extension-reg',
          contributes: {
            datasources: [
              {
                id: 'discovery-test-reg',
                name: 'Discovery Test',
                drivers: ['discovery.test.driver'],
              },
            ],
            drivers: [
              {
                id: 'discovery.test.driver',
                name: 'Test Driver',
                runtime: 'node',
                entry: './dist/driver.js',
              },
            ],
          },
        }),
      );

      registerExtensionsFromFolders([baseDir]);

      const ext = ExtensionsRegistry.get('discovery-test-reg');
      expect(ext).toBeDefined();
      expect(ext?.name).toBe('Discovery Test');
      expect(ext?.scope).toBe(ExtensionScope.DATASOURCE);
      expect(ext?.drivers).toHaveLength(1);
      expect(ext?.drivers[0]?.id).toBe('discovery.test.driver');
    });
  });
});
