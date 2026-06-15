import { app, BrowserWindow, ipcMain } from "electron";
import started from "electron-squirrel-startup";
import path from "node:path";

import {
  ensureBackendRunning,
  resolveBackendDir,
  resolvePythonExecutable,
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
import { runModelSetup } from "./setup-runner";
import {
  getSetupSnapshot,
  initializeSetupSnapshot,
  setSetupSnapshot,
} from "./setup-state";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

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
    window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
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
    await runModelSetup(
      resolveBackendDir(),
      resolvePythonExecutable(),
      window,
    );
    setSetupSnapshot({ status: "complete" });
  } catch (error) {
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

  initializeSetupSnapshot(resolveBackendDir(), shouldRunModelSetupOnStart());
  startBackend();

  mainWindow = createWindow();
  await waitForWindowLoad(mainWindow);
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
