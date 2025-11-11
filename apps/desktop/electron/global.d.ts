import type { DesktopApi } from "@qwery/shared/desktop";

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}

export {};

