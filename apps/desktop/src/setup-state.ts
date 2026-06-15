import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

import { resolveBackendDir } from "./backend-process";
import type { SetupProgressEvent, SetupSnapshot } from "./electron-api.types";
import { getWhisperModelDir } from "./env";

export type { SetupSnapshot } from "./electron-api.types";

let snapshot: SetupSnapshot = { status: "idle" };

export function getSetupSnapshot(): SetupSnapshot {
  return snapshot;
}

export function setSetupSnapshot(next: SetupSnapshot): void {
  snapshot = next;
}

export function initializeSetupSnapshot(runOnStart: boolean): SetupSnapshot {
  if (isModelSetupComplete()) {
    const next: SetupSnapshot = { status: "skipped", reason: "already-complete" };
    setSetupSnapshot(next);
    return next;
  }

  if (!runOnStart) {
    const next: SetupSnapshot = {
      status: "skipped",
      reason: "disabled",
      hint: "Run npm run setup:models or set RUN_MODEL_SETUP_ON_START=true",
    };
    setSetupSnapshot(next);
    return next;
  }

  setSetupSnapshot({ status: "idle" });
  return { status: "idle" };
}

export function resolveSetupMarkerPath(): string {
  const whisperModelDir = getWhisperModelDir();
  const baseDir = app.isPackaged ? app.getPath("userData") : resolveBackendDir();
  const modelPath = path.isAbsolute(whisperModelDir)
    ? whisperModelDir
    : path.join(baseDir, whisperModelDir);

  return path.join(modelPath, ".setup-complete");
}

export function isModelSetupComplete(): boolean {
  return fs.existsSync(resolveSetupMarkerPath());
}

export function applySetupProgress(event: SetupProgressEvent): void {
  setSetupSnapshot({
    status: "running",
    message: event.message,
    percent: event.percent,
  });
}
