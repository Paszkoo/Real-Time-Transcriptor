import { autoUpdater } from "electron-updater";
import type { BrowserWindow } from "electron";

export function initAutoUpdater(window: BrowserWindow | null): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    window?.webContents.send("update:status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    window?.webContents.send("update:status", {
      status: "available",
      version: info.version,
    });
  });

  autoUpdater.on("update-not-available", () => {
    window?.webContents.send("update:status", { status: "idle" });
  });

  autoUpdater.on("download-progress", (progress) => {
    window?.webContents.send("update:progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    window?.webContents.send("update:status", {
      status: "ready",
      version: info.version,
    });
  });

  autoUpdater.on("error", (error) => {
    window?.webContents.send("update:status", {
      status: "error",
      message: error.message,
    });
  });

  void autoUpdater.checkForUpdatesAndNotify();
}

export function installPendingUpdate(): void {
  autoUpdater.quitAndInstall();
}
