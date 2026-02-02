import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import type { Hono } from 'hono';

export async function createTestApp(): Promise<{ app: Hono; testDir: string }> {
  const testDir = path.join(
    os.tmpdir(),
    `qwery-server-api-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  await fs.mkdir(testDir, { recursive: true });
  process.env.QWERY_STORAGE_DIR = testDir;
  const mod = await import('../../src/server.js');
  const app = mod.createApp();
  return { app, testDir };
}

export async function cleanupTestDir(testDir: string): Promise<void> {
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
}
