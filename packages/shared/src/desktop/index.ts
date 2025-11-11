export interface DesktopApi {
  getAppVersion: () => Promise<string>;
  platform: NodeJS.Platform;
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
