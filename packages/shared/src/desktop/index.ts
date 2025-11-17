export interface DesktopApi {
  getAppVersion: () => Promise<string>;
  platform: NodeJS.Platform;
  // Window controls for custom frame
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onWindowMaximize: (callback: (isMaximized: boolean) => void) => () => void;
}

const resolveDesktopApi = (): DesktopApi | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.desktop;
};

export const getDesktopApi = (): DesktopApi | undefined => resolveDesktopApi();

export const isDesktopApp = (): boolean => Boolean(resolveDesktopApi());

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}
