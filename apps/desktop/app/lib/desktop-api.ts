'use client';

interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

interface DesktopApi {
  getAppVersion: () => Promise<string>;
  platform: string;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openFile: (options?: FileDialogOptions) => Promise<string | null>;
  saveFile: (options?: FileDialogOptions) => Promise<string | null>;
}

export function createDesktopApi(): DesktopApi {
  const api: DesktopApi & { _platform?: string } = {
    platform: '',
    async getAppVersion() {
      const { getVersion } = await import('@tauri-apps/api/app');
      return getVersion();
    },
    async minimize() {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const w = getCurrentWindow();
      await w.minimize();
    },
    async maximize() {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const w = getCurrentWindow();
      const isMax = await w.isMaximized();
      if (isMax) await w.unmaximize();
      else await w.maximize();
    },
    async close() {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const w = getCurrentWindow();
      await w.close();
    },
    async openFile(options?: FileDialogOptions) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const path = await open({
        title: options?.title,
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
      return typeof path === 'string' ? path : path?.[0] ?? null;
    },
    async saveFile(options?: FileDialogOptions) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({
        title: options?.title,
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
      return path ?? null;
    },
  };
  import('@tauri-apps/plugin-os')
    .then(({ platform }) => platform())
    .then((p) => {
      api.platform = p;
    })
    .catch(() => {});
  return api;
}

export function initDesktopApi(): void {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;
  (window as Window & { desktop?: DesktopApi }).desktop = createDesktopApi();
}
