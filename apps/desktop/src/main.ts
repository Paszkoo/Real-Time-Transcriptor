import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import started from "electron-squirrel-startup";
import fs from "node:fs/promises";
import path from "node:path";

import type { DesktopSettingsUpdateRequest, SaveExportFileRequest } from "./electron-api.types";

import { getDesktopSettings, patchDesktopSettings } from "./settings-store";

import {
  ensureBackendRunning,
  getPackagedBundleErrorMessage,
  startBackend,
  stopBackend,
} from "./backend-process";
import {
  getBackendPort,
  getHealthCheckHost,
  loadEnvironment,
  shouldOpenDevTools,
  shouldRunModelSetupOnStart,
} from "./env";
import { isSetupRunning, runModelSetup, SetupFailure } from "./setup-runner";
import { getSetupSnapshot, initializeSetupSnapshot, setSetupSnapshot } from "./setup-state";
import { initAutoUpdater, installPendingUpdate } from "./updater";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const ALLOWED_EXTERNAL_URL_PREFIXES = ["https://ollama.com/"];

let mainWindow: BrowserWindow | null = null;

function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return false;
    }

    return ALLOWED_EXTERNAL_URL_PREFIXES.some(
      (prefix) => parsed.href === prefix || parsed.href.startsWith(prefix),
    );
  } catch {
    return false;
  }
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 960,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    if (shouldOpenDevTools()) {
      window.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  window.on("closed", () => {
    mainWindow = null;
  });

  return window;
}

function waitForWindowLoad(window: BrowserWindow): Promise<void> {
  if (window.webContents.isLoadingMainFrame()) {
    return new Promise((resolve) => {
      window.webContents.once("did-finish-load", () => resolve());
    });
  }

  return Promise.resolve();
}

async function maybeRunFirstLaunchSetup(window: BrowserWindow): Promise<void> {
  const snapshot = getSetupSnapshot();
  if (snapshot.status !== "idle") {
    return;
  }

  setSetupSnapshot({ status: "running", message: "Starting first-run model setup…", percent: 0 });
  window.webContents.send("setup:start");

  try {
    await runModelSetup(window);
    setSetupSnapshot({ status: "complete" });
  } catch (error) {
    if (error instanceof SetupFailure) {
      return;
    }

    const message = error instanceof Error ? error.message : "Model setup failed";
    setSetupSnapshot({ status: "error", message });
    console.error("[setup] first launch setup failed:", error);
  }
}

if (started) {
  app.quit();
}

loadEnvironment();

app.whenReady().then(async () => {
  ipcMain.handle("get-backend-port", () => getBackendPort());
  ipcMain.handle("get-backend-host", () => getHealthCheckHost());
  ipcMain.handle("get-setup-state", () => getSetupSnapshot());
  ipcMain.handle("get-desktop-settings", () => getDesktopSettings());
  ipcMain.handle("patch-desktop-settings", (_event, update: DesktopSettingsUpdateRequest) =>
    patchDesktopSettings(update),
  );
  ipcMain.handle("get-app-version", () => app.getVersion());
  ipcMain.handle("open-external-url", (_event, url: string) => {
    if (!isAllowedExternalUrl(url)) {
      throw new Error("URL is not allowed.");
    }

    void shell.openExternal(url);
  });
  ipcMain.handle("retry-model-setup", async () => {
    const window = mainWindow ?? BrowserWindow.getAllWindows()[0];
    if (!window) {
      throw new Error("No application window available for setup.");
    }

    if (isSetupRunning()) {
      return getSetupSnapshot();
    }

    setSetupSnapshot({ status: "idle" });
    await maybeRunFirstLaunchSetup(window);
    return getSetupSnapshot();
  });
  ipcMain.handle("install-app-update", () => {
    installPendingUpdate();
  });
  ipcMain.handle("save-export-file", async (_event, request: SaveExportFileRequest) => {
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow;
    const result = await dialog.showSaveDialog(window ?? undefined, {
      defaultPath: request.defaultPath,
      filters: request.filters,
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    await fs.writeFile(result.filePath, Buffer.from(request.data));
    return { canceled: false, filePath: result.filePath };
  });

  initializeSetupSnapshot(shouldRunModelSetupOnStart());

  const bundleError = getPackagedBundleErrorMessage();
  if (bundleError) {
    setSetupSnapshot({ status: "error", message: bundleError });
  }

  startBackend();

  mainWindow = createWindow();
  await waitForWindowLoad(mainWindow);

  if (app.isPackaged) {
    initAutoUpdater(mainWindow);
  }

  await maybeRunFirstLaunchSetup(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      ensureBackendRunning();
      mainWindow = createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
});
