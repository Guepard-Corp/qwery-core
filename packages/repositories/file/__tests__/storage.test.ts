import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import {
  read,
  write,
  update,
  remove,
  list,
  NotFoundError,
} from '../src/storage.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function keyToFilePath(key: string[]): string {
  return path.join(getStorageDir(), ...key) + '.json';
}

async function assertFileExists(key: string[]): Promise<void> {
  const filePath = keyToFilePath(key);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

async function assertFileContent<T>(key: string[], expected: T): Promise<void> {
  const filePath = keyToFilePath(key);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as T;
  expect(parsed).toEqual(expected);
}

describe('Storage', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-storage-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
  });

  afterEach(() => {
    resetStorageDir();
  });

  describe('write and read', () => {
    it('writes and reads json by key', async () => {
      const key = ['project', 'test-id-1'];
      const content = { id: 'test-id-1', name: 'Test' };
      await write(key, content);
      await assertFileExists(key);
      await assertFileContent(key, content);
      const result = await read<typeof content>(key);
      expect(result).toEqual(content);
    });

    it('creates parent directories and file on disk', async () => {
      const key = ['message', 'conv-1', 'msg-1'];
      const content = { id: 'msg-1', conversationId: 'conv-1' };
      await write(key, content);
      await assertFileExists(key);
      await assertFileContent(key, content);
      const result = await read<typeof content>(key);
      expect(result).toEqual(content);
    });
  });

  describe('update', () => {
    it('reads, mutates, and writes file on disk', async () => {
      const key = ['project', 'test-id-2'];
      await write(key, { id: 'test-id-2', count: 0 });
      await assertFileExists(key);
      const result = await update<{ id: string; count: number }>(
        key,
        (draft) => {
          draft.count += 1;
        },
      );
      expect(result.count).toBe(1);
      await assertFileContent(key, { id: 'test-id-2', count: 1 });
      const readBack = await read<{ count: number }>(key);
      expect(readBack.count).toBe(1);
    });
  });

  describe('remove', () => {
    it('removes file from disk and does not throw if missing', async () => {
      const key = ['project', 'test-id-3'];
      await write(key, { id: 'test-id-3' });
      await assertFileExists(key);
      await remove(key);
      await expect(fs.stat(keyToFilePath(key))).rejects.toThrow();
      await expect(read(key)).rejects.toThrow(NotFoundError);
      await remove(key);
    });
  });

  describe('list', () => {
    it('returns keys under prefix and files exist on disk', async () => {
      await write(['project', 'id1'], { id: 'id1' });
      await write(['project', 'id2'], { id: 'id2' });
      await assertFileExists(['project', 'id1']);
      await assertFileExists(['project', 'id2']);
      const keys = await list(['project']);
      expect(keys).toHaveLength(2);
      expect(keys).toContainEqual(['project', 'id1']);
      expect(keys).toContainEqual(['project', 'id2']);
    });

    it('returns nested keys for message and file exists', async () => {
      await write(['message', 'conv1', 'msg1'], { id: 'msg1' });
      await assertFileExists(['message', 'conv1', 'msg1']);
      const keys = await list(['message', 'conv1']);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toEqual(['message', 'conv1', 'msg1']);
    });

    it('returns empty array when prefix dir does not exist', async () => {
      const keys = await list(['nonexistent']);
      expect(keys).toEqual([]);
    });
  });

  describe('read throws NotFoundError', () => {
    it('throws NotFoundError for missing key', async () => {
      await expect(read(['project', 'missing'])).rejects.toThrow(NotFoundError);
    });
  });

  describe('withErrorHandling rethrows non-ENOENT', () => {
    it('rethrows when key path is a directory (EISDIR)', async () => {
      const dirPath = keyToFilePath(['isdir-key']);
      await fs.mkdir(path.dirname(dirPath), { recursive: true });
      await fs.mkdir(dirPath, { recursive: true });
      await expect(read(['isdir-key'])).rejects.toThrow();
      await expect(read(['isdir-key'])).rejects.not.toThrow(NotFoundError);
    });
  });
});
