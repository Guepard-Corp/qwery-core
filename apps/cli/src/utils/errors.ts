import { CommanderError } from 'commander';

export class CliUsageError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = 'CliUsageError';
  }
}

export function handleCliError(error: unknown): never {
  if (error instanceof CliUsageError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }

  if (error instanceof CommanderError) {
    if (error.code === 'commander.helpDisplayed') {
      process.exit(0);
    }
    console.error(error.message);
    process.exit(error.exitCode ?? 1);
  }

  if (error instanceof Error) {
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }

  console.error(String(error));
  process.exit(1);
}
