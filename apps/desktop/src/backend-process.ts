import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow } from "electron";

import { getBackendHost, getBackendPort } from "./env";
import { resolveBackendDirFromMain } from "./paths";

export type BackendLifecycleStatus = "restarting" | "stopped";

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

export function startBackend(): void {
  if (backendProcess) {
    return;
  }

  stoppingIntentionally = false;

  const backendDir = resolveBackendDir();
  const python = resolvePythonExecutable();
  const host = getBackendHost();
  const port = getBackendPort();

  backendProcess = spawn(
    python,
    ["-m", "uvicorn", "app.main:app", "--host", host, "--port", String(port)],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        BACKEND_HOST: host,
        BACKEND_PORT: String(port),
      },
      stdio: "pipe",
    },
  );

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
