import { contextBridge, ipcRenderer } from "electron";

import type { ElectronAPI } from "./electron-api.types";

function subscribe(channel: string, callback: () => void): () => void {
  const listener = () => callback();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function subscribePayload<T>(
  channel: string,
  callback: (payload: T) => void,
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => {
    callback(payload);
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const electronAPI: ElectronAPI = {
  getBackendPort: () => ipcRenderer.invoke("get-backend-port"),
  getBackendHost: () => ipcRenderer.invoke("get-backend-host"),
  getSetupState: () => ipcRenderer.invoke("get-setup-state"),
  onSetupStart: (callback) => subscribe("setup:start", callback),
  onSetupProgress: (callback) => subscribePayload("setup:progress", callback),
  onSetupComplete: (callback) => subscribe("setup:complete", callback),
  onSetupError: (callback) => subscribePayload("setup:error", callback),
  onBackendStatus: (callback) => subscribePayload("backend:status", callback),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
