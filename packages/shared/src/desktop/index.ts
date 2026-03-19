export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface DesktopApi {
  getAppVersion: () => Promise<string>;
  platform: string;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openFile: (options?: FileDialogOptions) => Promise<string | null>;
  saveFile: (options?: FileDialogOptions) => Promise<string | null>;
}

const resolveDesktopApi = (): DesktopApi | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return (window as Window & { desktop?: DesktopApi }).desktop;
};

export const getDesktopApi = (): DesktopApi | undefined => resolveDesktopApi();

export const isDesktopApp = (): boolean =>
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window ||
    Boolean((window as Window & { desktop?: DesktopApi }).desktop));

export type Platform = 'web' | 'desktop';

export const platform: Platform =
  typeof window !== 'undefined' && isDesktopApp() ? 'desktop' : 'web';

export const isDesktop = (): boolean => platform === 'desktop';

export const isWeb = (): boolean => platform === 'web';

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}
