#!/usr/bin/env node
import { CliApplication } from './cli-application';
import { handleCliError } from './utils/errors';

async function bootstrap() {
  const app = new CliApplication();
  await app.run(process.argv);
}

bootstrap().catch((error) => {
  handleCliError(error);
});

