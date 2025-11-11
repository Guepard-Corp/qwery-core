import process from 'node:process';

/**
 * @name getPinoLogger
 * @description A logger implementation using Pino
 */
export async function getPinoLogger() {
  const { pino } = await import('pino').catch();

  return pino({
    browser: {
      asObject: true,
    },
    level: 'debug',
    base: {
      env: process.env.NODE_ENV,
    },
    errorKey: 'error',
  });
}
