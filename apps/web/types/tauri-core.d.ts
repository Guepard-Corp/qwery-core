declare module '@tauri-apps/api/core' {
  export function invoke(
    cmd: 'debug_keyring_status',
  ): Promise<Record<string, string>>;
  export function invoke(
    cmd: 'get_app_config',
  ): Promise<Record<string, string>>;
  export function invoke(
    cmd: 'set_app_config',
    args: { config: Record<string, string> },
  ): Promise<void>;
  export function invoke<T = unknown>(
    cmd: string,
    args?: Record<string, unknown>,
  ): Promise<T>;
}
