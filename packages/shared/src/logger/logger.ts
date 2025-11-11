type LogFn = {
  <T extends object>(obj: T, msg?: string, ...args: unknown[]): void;
  (obj: unknown, msg?: string, ...args: unknown[]): void;
  (msg: string, ...args: unknown[]): void;
};

/**
 * @name Logger
 * @description Logger interface for logging messages
 */
export interface Logger {
  info: LogFn;
  error: LogFn;
  warn: LogFn;
  debug: LogFn;
  fatal: LogFn;
}
