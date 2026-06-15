import { contextBridge, ipcRenderer } from "electron";

import type {
  DesktopSettingsUpdateRequest,
  ElectronAPI,
  SaveExportFileRequest,
} from "./electron-api.types";

function subscribe(channel: string, callback: () => void): () => void {
  const listener = () => callback();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function subscribePayload<T>(channel: string, callback: (payload: T) => void): () => void {
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
  onSetupOllamaMissing: (callback) => subscribePayload("setup:ollama-missing", callback),
  onSetupOllamaUnreachable: (callback) => subscribePayload("setup:ollama-unreachable", callback),
  onBackendStatus: (callback) => subscribePayload("backend:status", callback),
  onUpdateStatus: (callback) => subscribePayload("update:status", callback),
  onUpdateProgress: (callback) => subscribePayload("update:progress", callback),
  saveExportFile: (request: SaveExportFileRequest) =>
    ipcRenderer.invoke("save-export-file", request),
  getDesktopSettings: () => ipcRenderer.invoke("get-desktop-settings"),
  patchDesktopSettings: (update: DesktopSettingsUpdateRequest) =>
    ipcRenderer.invoke("patch-desktop-settings", update),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  openExternalUrl: (url: string) => ipcRenderer.invoke("open-external-url", url),
  retryModelSetup: () => ipcRenderer.invoke("retry-model-setup"),
  installAppUpdate: () => ipcRenderer.invoke("install-app-update"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
