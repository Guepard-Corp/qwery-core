let logPath: string | null = null;
let fs: typeof import('node:fs') | null = null;

function write(level: string, ...args: unknown[]) {
  if (!logPath || !fs) return;
  const line =
    [new Date().toISOString(), level, ...args.map((a) => String(a))].join(' ') +
    '\n';
  try {
    fs.appendFileSync(logPath, line);
  } catch {
    // ignore
  }
}

export function initTuiLogger(
  resolvedPath: string | null,
  fsModule: typeof import('node:fs') | null,
) {
  if (typeof process === 'undefined') return;
  logPath = resolvedPath ?? null;
  fs = fsModule ?? null;
  if (!logPath || !fs) return;
  try {
    fs.writeFileSync(logPath, '');
  } catch {
    // ignore
  }
  write('LOG', '[TUI] Logger initialized', logPath);
}

export function tuiLog(
  level: 'LOG' | 'DEBUG' | 'WARN' | 'ERROR',
  ...args: unknown[]
) {
  write(level, ...args);
}

export function tuiLogAction(type: string, payload: unknown) {
  write('ACTION', type, JSON.stringify(payload));
}

export function isTuiLogEnabled(): boolean {
  return logPath != null;
}
