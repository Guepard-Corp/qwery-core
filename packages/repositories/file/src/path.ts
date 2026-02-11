import path from 'node:path';
import os from 'node:os';

const APP_NAME = 'qwery';
const STORAGE_SUBDIR = 'storage';

function getDataDir(): string {
  if (process.env.QWERY_STORAGE_DIR) {
    return process.env.QWERY_STORAGE_DIR;
  }
  const home = os.homedir();
  if (process.platform === 'win32') {
    const base =
      process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
    return path.join(base, APP_NAME, STORAGE_SUBDIR);
  }
  const base = process.env.XDG_DATA_HOME ?? path.join(home, '.local', 'share');
  return path.join(base, APP_NAME, STORAGE_SUBDIR);
}

let storageDir: string | null = null;

export function getStorageDir(): string {
  if (storageDir === null) {
    storageDir = getDataDir();
  }
  return storageDir;
}

export function setStorageDir(dir: string): void {
  storageDir = dir;
}

export function resetStorageDir(): void {
  storageDir = null;
}
