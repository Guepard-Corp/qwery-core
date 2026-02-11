import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

describe('path', () => {
  afterEach(() => {
    resetStorageDir();
  });

  describe('getStorageDir', () => {
    it('returns overridden dir when setStorageDir was called', () => {
      const dir = path.join(os.tmpdir(), 'qwery-test-override');
      setStorageDir(dir);
      expect(getStorageDir()).toBe(dir);
    });

    it('returns XDG_DATA_HOME path when env is set', () => {
      const xdg = path.join(os.tmpdir(), 'xdg-data-home');
      delete process.env.QWERY_STORAGE_DIR;
      process.env.XDG_DATA_HOME = xdg;
      resetStorageDir();
      const result = getStorageDir();
      expect(result).toBe(path.join(xdg, 'qwery', 'storage'));
    });

    it('returns QWERY_STORAGE_DIR when env is set', () => {
      const custom = path.join(os.tmpdir(), 'custom-storage');
      process.env.QWERY_STORAGE_DIR = custom;
      resetStorageDir();
      const result = getStorageDir();
      expect(result).toBe(custom);
    });

    it('returns default under homedir when no env', () => {
      delete process.env.QWERY_STORAGE_DIR;
      delete process.env.XDG_DATA_HOME;
      resetStorageDir();
      const result = getStorageDir();
      const home = os.homedir();
      const expected =
        process.platform === 'win32'
          ? path.join(
              process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'),
              'qwery',
              'storage',
            )
          : path.join(home, '.local', 'share', 'qwery', 'storage');
      expect(result).toBe(expected);
    });

    it('on win32 uses LOCALAPPDATA when set', () => {
      const originalPlatform = process.platform;
      const originalLocalAppData = process.env.LOCALAPPDATA;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });
      const localAppData = path.join(os.tmpdir(), 'local-app-data');
      process.env.LOCALAPPDATA = localAppData;
      delete process.env.QWERY_STORAGE_DIR;
      resetStorageDir();
      const result = getStorageDir();
      expect(result).toBe(path.join(localAppData, 'qwery', 'storage'));
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
      if (originalLocalAppData !== undefined) {
        process.env.LOCALAPPDATA = originalLocalAppData;
      } else {
        delete process.env.LOCALAPPDATA;
      }
    });

    it('on win32 uses homedir when LOCALAPPDATA not set', () => {
      const originalPlatform = process.platform;
      const originalLocalAppData = process.env.LOCALAPPDATA;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });
      delete process.env.LOCALAPPDATA;
      delete process.env.QWERY_STORAGE_DIR;
      resetStorageDir();
      const result = getStorageDir();
      const home = os.homedir();
      expect(result).toBe(
        path.join(home, 'AppData', 'Local', 'qwery', 'storage'),
      );
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
      if (originalLocalAppData !== undefined) {
        process.env.LOCALAPPDATA = originalLocalAppData;
      }
    });
  });

  describe('setStorageDir and resetStorageDir', () => {
    beforeEach(() => {
      resetStorageDir();
    });

    it('setStorageDir overrides getStorageDir', () => {
      const dir = path.join(os.tmpdir(), 'qwery-set-dir');
      setStorageDir(dir);
      expect(getStorageDir()).toBe(dir);
    });

    it('resetStorageDir clears override so getStorageDir uses env/default', () => {
      setStorageDir(path.join(os.tmpdir(), 'override'));
      resetStorageDir();
      const result = getStorageDir();
      const home = os.homedir();
      const expected =
        process.platform === 'win32'
          ? path.join(
              process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'),
              'qwery',
              'storage',
            )
          : path.join(home, '.local', 'share', 'qwery', 'storage');
      expect(result).toBe(expected);
    });
  });
});
