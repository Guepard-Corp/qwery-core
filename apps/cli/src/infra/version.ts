import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Installer-written marker; also rewritten by the wrapper after a self-update. */
const VERSION_FILE = join(homedir(), '.qwery', 'version');

/**
 * Version of the running app (ADR #37).
 *
 * Baked at compile time by `scripts/build-release.ts` (`--define`), with a
 * fallback to the installer-written `~/.qwery/version`. Returns `undefined` in
 * development or when otherwise unknown — callers treat that as "skip update
 * checks" rather than guessing.
 */
export function getAppVersion(): string | undefined {
  const baked = process.env.QWERY_VERSION;
  if (baked && baked.length > 0) return baked;
  try {
    if (existsSync(VERSION_FILE)) {
      const fromFile = readFileSync(VERSION_FILE, 'utf-8').trim();
      return fromFile.length > 0 ? fromFile : undefined;
    }
  } catch {
    // Unreadable marker — treat as unknown.
  }
  return undefined;
}
