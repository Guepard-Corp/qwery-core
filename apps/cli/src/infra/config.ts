import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ConfigStore, ProviderConfig, UserConfig } from '@qwery/domain';

const CONFIG_DIR = join(homedir(), '.qwery');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: UserConfig = { providers: {} };

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

class FileConfigStore implements ConfigStore {
  read(): UserConfig {
    if (!existsSync(CONFIG_PATH)) return structuredClone(DEFAULT_CONFIG);
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<UserConfig>;
      return { ...parsed, providers: parsed.providers ?? {} };
    } catch {
      return structuredClone(DEFAULT_CONFIG);
    }
  }

  write(config: UserConfig): void {
    ensureDir();
    writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    try {
      chmodSync(CONFIG_PATH, 0o600);
    } catch {
      // Best effort on non-POSIX.
    }
  }

  setProviderConfig(providerConfig: ProviderConfig, makeActive = true): UserConfig {
    const cfg = this.read();
    cfg.providers[providerConfig.id] = providerConfig;
    if (makeActive) cfg.activeProvider = providerConfig.id;
    this.write(cfg);
    return cfg;
  }

  getActiveProvider(): ProviderConfig | null {
    const cfg = this.read();
    if (!cfg.activeProvider) return null;
    return cfg.providers[cfg.activeProvider] ?? null;
  }
}

export function createFileConfigStore(): ConfigStore {
  ensureDir();
  return new FileConfigStore();
}

export const CONFIG_FILE = CONFIG_PATH;
