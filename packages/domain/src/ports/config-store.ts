import type { ProviderConfig, UserConfig } from '../provider';

/**
 * Config store port — persists the user-scoped configuration (selected LLM
 * provider, credentials). Implementations may use the OS keychain or an
 * encrypted file in `~/.qwery/` (ADR #19).
 */
export interface ConfigStore {
  read(): UserConfig;
  write(config: UserConfig): void;
  setProviderConfig(config: ProviderConfig, makeActive?: boolean): UserConfig;
  getActiveProvider(): ProviderConfig | null;
}
