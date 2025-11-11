import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "@qwery/shared/desktop";

const api: DesktopApi = {
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  platform: process.platform,
};

contextBridge.exposeInMainWorld("desktop", api);

