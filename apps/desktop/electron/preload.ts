import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "@qwery/shared/desktop";

const api: DesktopApi = {
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  platform: process.platform,
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowMaximize: () => ipcRenderer.invoke("window:maximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowIsMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  onWindowMaximize: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on("window:maximize-changed", (_event, isMaximized: boolean) => {
      callback(isMaximized);
    });
    return () => {
      ipcRenderer.removeAllListeners("window:maximize-changed");
    };
  },
};

contextBridge.exposeInMainWorld("desktop", api);

