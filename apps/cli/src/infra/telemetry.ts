import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.qwery');
const ANON_ID_PATH = join(CONFIG_DIR, 'anonymous-id');

/**
 * Returns a stable, anonymous per-install id used as the telemetry distinct id.
 * It is a random UUID — no machine, user or path data — persisted under
 * `~/.qwery/` so analytics can de-duplicate sessions without identifying users.
 *
 * No `existsSync` check-then-act (TOCTOU): we read directly and treat any failure
 * as "not created yet", and `mkdirSync({ recursive: true })` is idempotent.
 */
export function getAnonymousId(): string {
  try {
    const existing = readFileSync(ANON_ID_PATH, 'utf-8').trim();
    if (existing) return existing;
  } catch {
    // Missing or unreadable — fall through and create it.
  }
  try {
    const id = randomUUID();
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(ANON_ID_PATH, `${id}\n`, { mode: 0o600 });
    return id;
  } catch {
    // Filesystem unavailable — fall back to an ephemeral id.
    return randomUUID();
  }
}
