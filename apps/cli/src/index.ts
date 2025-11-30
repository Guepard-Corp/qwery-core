#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

process.env.NODE_NO_WARNINGS ??= '1';
(globalThis as Record<string, unknown>).AI_SDK_LOG_WARNINGS = false;

if (!process.env.VITE_WORKING_DIR && !process.env.WORKSPACE) {
  process.env.VITE_WORKING_DIR = process.env.WORKING_DIR || 'workspace';
}
if (!process.env.WORKSPACE) {
  process.env.WORKSPACE = process.env.VITE_WORKING_DIR || 'workspace';
}

async function bootstrap() {
  const [{ CliApplication }, { registerCliExtensions }] = await Promise.all([
    import('./cli-application'),
    import('./extensions/register'),
  ]);

  registerCliExtensions();

  const app = new CliApplication();
  await app.run(process.argv);
}

bootstrap().catch(async (error) => {
  const { handleCliError } = await import('./utils/errors');
  handleCliError(error);
});
