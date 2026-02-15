import '@qwery/extensions-loader';
import { ExtensionsRegistry, ExtensionScope } from '@qwery/extensions-sdk';
import { getLogger } from '@qwery/shared/logger';
import { createApp } from './server';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');
const envPath = join(serverRoot, '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed
          .slice(eq + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
        if (process.env[key] === undefined) process.env[key] = value;
      }
    }
  }
}

const storageDir = process.env.QWERY_STORAGE_DIR ?? 'qwery.db';
process.env.QWERY_STORAGE_DIR = isAbsolute(storageDir)
  ? storageDir
  : resolve(serverRoot, storageDir);

const raw =
  process.env.WORKSPACE?.trim() ||
  process.env.VITE_WORKING_DIR?.trim() ||
  process.env.WORKING_DIR?.trim() ||
  'workspace';
process.env.WORKSPACE = isAbsolute(raw) ? raw : resolve(serverRoot, raw);

const PORT = Number(process.env.PORT ?? 4096);
const HOSTNAME = process.env.HOSTNAME ?? '0.0.0.0';

const logger = await getLogger();
const extensionsCount = ExtensionsRegistry.list(ExtensionScope.DATASOURCE)
  .length;
logger.info(`Discovered ${extensionsCount} datasource extensions`);

const app = createApp();

const server = Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  fetch: app.fetch,
  idleTimeout: 120,
});

logger.info(
  { hostname: server.hostname, port: server.port },
  `Listening on http://${server.hostname}:${server.port}`,
);
