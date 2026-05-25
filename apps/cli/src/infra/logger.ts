import { appendFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Logger, LogLevel } from '@qwery/domain';

const LOG_DIR = resolve(process.cwd(), '.qwery', 'logs');
const LOG_FILE = join(LOG_DIR, 'qwery.log');

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  mkdirSync(LOG_DIR, { recursive: true });
  initialized = true;
  appendFileSync(
    LOG_FILE,
    `${JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      event: 'session.start',
      pid: process.pid,
      cwd: process.cwd(),
    })}\n`,
  );
}

function write(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  ensureInitialized();
  const line = `${JSON.stringify({ ts: new Date().toISOString(), level, event, ...data })}\n`;
  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    // Never let logging crash the agent.
  }
}

export function createFileLogger(): Logger {
  return {
    debug: (event, data) => write('debug', event, data),
    info: (event, data) => write('info', event, data),
    warn: (event, data) => write('warn', event, data),
    error: (event, data) => write('error', event, data),
  };
}

export const LOG_PATH = LOG_FILE;
