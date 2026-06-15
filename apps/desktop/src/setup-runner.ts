import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { BrowserWindow } from "electron";
import { app } from "electron";

import {
  buildPackagedBackendEnv,
  buildSetupSpawnArgs,
  getPackagedBundleErrorMessage,
  usesBundledBackend,
} from "./backend-process";
import type { SetupProgressEvent } from "./electron-api.types";
import { applySetupProgress, setSetupSnapshot } from "./setup-state";

const SETUP_PROGRESS = /^PROGRESS\s+(\d+)\|(.+)$/;
const LEGACY_PROGRESS = /(\d+)%/;

// Keep in sync with EXIT_OLLAMA_* in apps/backend/scripts/first_run_setup.py
export const SETUP_EXIT_OLLAMA_MISSING = 2;
export const SETUP_EXIT_OLLAMA_UNREACHABLE = 3;

let setupRunning = false;

export function isSetupRunning(): boolean {
  return setupRunning;
}

export class SetupFailure extends Error {
  constructor(
    message: string,
    readonly exitCode: number | null,
    readonly kind: "generic" | "ollama-missing" | "ollama-unreachable",
  ) {
    super(message);
    this.name = "SetupFailure";
  }
}

type SetupFailureKind = SetupFailure["kind"];

function rejectSetupFailure(
  window: BrowserWindow,
  reject: (error: SetupFailure) => void,
  kind: SetupFailureKind,
  message: string,
  exitCode: number | null,
): void {
  if (kind === "ollama-missing" || kind === "ollama-unreachable") {
    setSetupSnapshot({ status: kind, message });
    window.webContents.send(`setup:${kind}`, { message });
  } else {
    setSetupSnapshot({ status: "error", message });
    window.webContents.send("setup:error", { message, kind: "generic" });
  }

  reject(new SetupFailure(message, exitCode, kind));
}

export function runModelSetup(window: BrowserWindow): Promise<void> {
  const bundleError = getPackagedBundleErrorMessage();
  if (bundleError) {
    setSetupSnapshot({ status: "error", message: bundleError });
    window.webContents.send("setup:error", { message: bundleError, kind: "generic" });
    return Promise.reject(new SetupFailure(bundleError, null, "generic"));
  }

  if (setupRunning) {
    const message = "Model setup is already running.";
    return Promise.reject(new SetupFailure(message, null, "generic"));
  }

  setupRunning = true;

  return new Promise((resolve, reject) => {
    const spawnConfig = buildSetupSpawnArgs();
    const env = app.isPackaged && usesBundledBackend()
      ? buildPackagedBackendEnv()
      : process.env;

    const child = spawn(spawnConfig.command, spawnConfig.args, {
      cwd: spawnConfig.cwd,
      env,
      stdio: "pipe",
    }) as ChildProcessWithoutNullStreams;

    let lastPercent = 0;

    const finish = (): void => {
      setupRunning = false;
    };

    const emitProgress = (line: string) => {
      const structured = SETUP_PROGRESS.exec(line);
      let percent = lastPercent;
      let message = line;

      if (structured) {
        percent = Number.parseInt(structured[1], 10);
        message = structured[2];
        lastPercent = percent;
      } else {
        const legacy = LEGACY_PROGRESS.exec(line);
        if (legacy) {
          percent = Number.parseInt(legacy[1], 10);
          if (percent > lastPercent) {
            lastPercent = percent;
          }
        }
      }

      const event: SetupProgressEvent = {
        message,
        percent: Number.isNaN(percent) ? lastPercent : percent,
      };
      applySetupProgress(event);
      window.webContents.send("setup:progress", event);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line.trim()) {
          console.log(`[setup] ${line}`);
          emitProgress(line);
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line.trim()) {
          console.error(`[setup] ${line}`);
          emitProgress(line);
        }
      }
    });

    child.on("error", (error) => {
      finish();
      rejectSetupFailure(window, reject, "generic", error.message, null);
    });

    child.on("exit", (code) => {
      finish();

      if (code === 0) {
        window.webContents.send("setup:complete");
        resolve();
        return;
      }

      if (code === SETUP_EXIT_OLLAMA_MISSING) {
        rejectSetupFailure(
          window,
          reject,
          "ollama-missing",
          "Ollama is not installed.",
          code,
        );
        return;
      }

      if (code === SETUP_EXIT_OLLAMA_UNREACHABLE) {
        rejectSetupFailure(
          window,
          reject,
          "ollama-unreachable",
          "Ollama is installed but not running.",
          code,
        );
        return;
      }

      rejectSetupFailure(
        window,
        reject,
        "generic",
        `Model setup exited with code ${code ?? "unknown"}`,
        code,
      );
    });
  });
}
