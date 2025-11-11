import type { Logger as AbstractLogger } from '../logger';

export const Logger: AbstractLogger = {
  info: console.info,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
  fatal: console.error,
};
