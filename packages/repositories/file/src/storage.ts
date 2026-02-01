import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import { getStorageDir } from './path.js';
import { readLock, writeLock } from './lock.js';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  return e instanceof Error && 'code' in e;
}

let initPromise: Promise<void> | null = null;

async function ensureDir(): Promise<string> {
  const dir = getStorageDir();
  if (initPromise === null) {
    initPromise = fs.mkdir(dir, { recursive: true }).then(() => undefined);
  }
  await initPromise;
  return dir;
}

function keyToPath(dir: string, key: string[]): string {
  return path.join(dir, ...key) + '.json';
}

async function withErrorHandling<T>(body: () => Promise<T>): Promise<T> {
  try {
    return await body();
  } catch (e) {
    if (isErrnoException(e) && e.code === 'ENOENT') {
      throw new NotFoundError(`Resource not found: ${e.path}`);
    }
    throw e;
  }
}

export async function remove(key: string[]): Promise<void> {
  const dir = await ensureDir();
  const target = keyToPath(dir, key);
  await fs.unlink(target).catch(() => {});
}

export async function read<T>(key: string[]): Promise<T> {
  const dir = await ensureDir();
  const target = keyToPath(dir, key);
  return withErrorHandling(async () => {
    using _ = await readLock(target);
    const raw = await fs.readFile(target, 'utf-8');
    return JSON.parse(raw) as T;
  });
}

export async function update<T>(
  key: string[],
  fn: (draft: T) => void,
): Promise<T> {
  const dir = await ensureDir();
  const target = keyToPath(dir, key);
  return withErrorHandling(async () => {
    using _ = await writeLock(target);
    const raw = await fs.readFile(target, 'utf-8');
    const content = JSON.parse(raw) as T;
    fn(content);
    await fs.writeFile(target, JSON.stringify(content, null, 2));
    return content;
  });
}

export async function write<T>(key: string[], content: T): Promise<void> {
  const dir = await ensureDir();
  const target = keyToPath(dir, key);
  const parent = path.dirname(target);
  await fs.mkdir(parent, { recursive: true });
  await withErrorHandling(async () => {
    using _ = await writeLock(target);
    await fs.writeFile(target, JSON.stringify(content, null, 2));
  });
}

async function listRecursive(
  dir: string,
  prefix: string[],
): Promise<string[][]> {
  const result: string[][] = [];
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subKeys = await listRecursive(fullPath, [...prefix, entry.name]);
      result.push(...subKeys);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const id = entry.name.slice(0, -5);
      result.push([...prefix, id]);
    }
  }
  return result;
}

export async function list(prefix: string[]): Promise<string[][]> {
  const dir = await ensureDir();
  const targetDir = path.join(dir, ...prefix);
  const keys = await listRecursive(targetDir, prefix);
  keys.sort((a, b) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] ?? '';
      const y = b[i] ?? '';
      if (x !== y) return x < y ? -1 : 1;
    }
    /* istanbul ignore next - unreachable when keys are unique from list() */
    return 0;
  });
  return keys;
}
