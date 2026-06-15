import type { ElectronAPI } from "../electron-api.types";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
