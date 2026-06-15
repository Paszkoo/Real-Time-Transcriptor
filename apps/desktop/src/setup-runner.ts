import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { BrowserWindow } from "electron";

import type { SetupProgressEvent } from "./electron-api.types";
import { applySetupProgress } from "./setup-state";

const SETUP_PROGRESS = /(\d+)%/;

export function runModelSetup(
  backendDir: string,
  pythonExecutable: string,
  window: BrowserWindow,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, ["setup.py"], {
      cwd: backendDir,
      env: process.env,
      stdio: "pipe",
    }) as ChildProcessWithoutNullStreams;

    let lastPercent = 0;

    const emitProgress = (line: string) => {
      const match = SETUP_PROGRESS.exec(line);
      const percent = match ? Number.parseInt(match[1], 10) : undefined;

      if (percent !== undefined && percent > lastPercent) {
        lastPercent = percent;
      }

      const event: SetupProgressEvent = {
        message: line,
        percent: percent ?? lastPercent,
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
      window.webContents.send("setup:error", { message: error.message });
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        window.webContents.send("setup:complete");
        resolve();
        return;
      }

      const message = `Model setup exited with code ${code ?? "unknown"}`;
      window.webContents.send("setup:error", { message });
      reject(new Error(message));
    });
  });
}
