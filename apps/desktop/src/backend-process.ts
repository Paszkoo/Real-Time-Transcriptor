import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow } from "electron";

import { getBackendHost, getBackendPort } from "./env";
import { resolveBackendDirFromMain } from "./paths";

export type BackendLifecycleStatus = "restarting" | "stopped";

const BACKEND_EXECUTABLE = process.platform === "win32" ? "rtt-backend.exe" : "rtt-backend";
const SETUP_DIR = "setup";
const SETUP_EXECUTABLE = process.platform === "win32" ? "rtt-setup.exe" : "rtt-setup";

let backendProcess: ChildProcessWithoutNullStreams | null = null;
let stoppingIntentionally = false;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 3;

function notifyBackendStatus(status: BackendLifecycleStatus): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("backend:status", { status });
  }
}

export function resolveBackendDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend");
  }

  return resolveBackendDirFromMain(__dirname);
}

export function resolvePythonExecutable(): string {
  const backendDir = resolveBackendDir();
  const venvCandidates =
    process.platform === "win32"
      ? [
          path.join(backendDir, ".venv", "Scripts", "python.exe"),
          path.join(backendDir, "venv", "Scripts", "python.exe"),
        ]
      : [
          path.join(backendDir, ".venv", "bin", "python"),
          path.join(backendDir, "venv", "bin", "python"),
        ];

  for (const candidate of venvCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return process.platform === "win32" ? "python" : "python3";
}

export function resolveBackendExecutable(): string {
  if (app.isPackaged) {
    return path.join(resolveBackendDir(), BACKEND_EXECUTABLE);
  }

  return resolvePythonExecutable();
}

export function resolveSetupExecutable(): string {
  if (app.isPackaged) {
    return path.join(resolveBackendDir(), SETUP_DIR, SETUP_EXECUTABLE);
  }

  return resolvePythonExecutable();
}

export function usesBundledBackend(): boolean {
  if (!app.isPackaged) {
    return false;
  }

  return (
    fs.existsSync(resolveBackendExecutable()) && fs.existsSync(resolveSetupExecutable())
  );
}

export function getPackagedBundleErrorMessage(): string | null {
  if (!app.isPackaged || usesBundledBackend()) {
    return null;
  }

  return "Application files are incomplete. Please reinstall Real-Time Transcriptor.";
}

function buildBackendSpawnArgs(): { command: string; args: string[]; cwd: string } {
  const backendDir = resolveBackendDir();
  const bundled = usesBundledBackend();

  if (bundled) {
    return {
      command: resolveBackendExecutable(),
      args: [],
      cwd: backendDir,
    };
  }

  return {
    command: resolvePythonExecutable(),
    args: ["-m", "uvicorn", "app.main:app", "--host", getBackendHost(), "--port", String(getBackendPort())],
    cwd: backendDir,
  };
}

export function buildSetupSpawnArgs(): { command: string; args: string[]; cwd: string } {
  const backendDir = resolveBackendDir();

  if (usesBundledBackend()) {
    const setupDir = path.join(backendDir, SETUP_DIR);
    return {
      command: resolveSetupExecutable(),
      args: [],
      cwd: setupDir,
    };
  }

  return {
    command: resolvePythonExecutable(),
    args: ["setup.py"],
    cwd: backendDir,
  };
}

export function buildPackagedBackendEnv(): NodeJS.ProcessEnv {
  const userData = app.getPath("userData");
  const host = getBackendHost();
  const port = getBackendPort();

  return {
    ...process.env,
    BACKEND_HOST: host,
    BACKEND_PORT: String(port),
    WHISPER_MODEL_DIR: path.join(userData, "models", "whisper"),
    SESSION_DATA_DIR: path.join(userData, "data"),
  };
}

export function startBackend(): void {
  if (backendProcess) {
    return;
  }

  const bundleError = getPackagedBundleErrorMessage();
  if (bundleError) {
    console.error(`[backend] ${bundleError}`);
    notifyBackendStatus("stopped");
    return;
  }

  stoppingIntentionally = false;

  const host = getBackendHost();
  const port = getBackendPort();
  const spawnConfig = buildBackendSpawnArgs();
  const env = app.isPackaged ? buildPackagedBackendEnv() : {
    ...process.env,
    BACKEND_HOST: host,
    BACKEND_PORT: String(port),
  };

  backendProcess = spawn(spawnConfig.command, spawnConfig.args, {
    cwd: spawnConfig.cwd,
    env,
    stdio: "pipe",
  });

  backendProcess.stdout.on("data", (chunk: Buffer) => {
    console.log(`[backend] ${chunk.toString().trim()}`);
  });

  backendProcess.stderr.on("data", (chunk: Buffer) => {
    console.error(`[backend] ${chunk.toString().trim()}`);
  });

  backendProcess.on("exit", (code, signal) => {
    const reason = code ?? signal ?? "unknown";
    console.log(`[backend] exited (${reason})`);
    backendProcess = null;

    if (stoppingIntentionally || code === 0) {
      return;
    }

    if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
      notifyBackendStatus("stopped");
      return;
    }

    restartAttempts += 1;
    notifyBackendStatus("restarting");
    setTimeout(() => {
      startBackend();
    }, 2000);
  });
}

export function stopBackend(): void {
  if (!backendProcess) {
    return;
  }

  stoppingIntentionally = true;
  restartAttempts = 0;
  backendProcess.kill();
  backendProcess = null;
}

export function ensureBackendRunning(): void {
  if (!backendProcess) {
    startBackend();
  }
}
