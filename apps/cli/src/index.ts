#!/usr/bin/env node

process.env.NODE_NO_WARNINGS ??= '1';
(globalThis as Record<string, unknown>).AI_SDK_LOG_WARNINGS = false;

import { CliApplication } from './cli-application';
import { handleCliError } from './utils/errors';

async function bootstrap() {
  const app = new CliApplication();
  await app.run(process.argv);
}

bootstrap().catch((error) => {
  handleCliError(error);
});

