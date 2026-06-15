import fs from "node:fs";
import path from "node:path";

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

export function initializeSetupSnapshot(
  backendDir: string,
  runOnStart: boolean,
): SetupSnapshot {
  if (isModelSetupComplete(backendDir)) {
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

export function resolveSetupMarkerPath(backendDir: string): string {
  const whisperModelDir = getWhisperModelDir();
  const modelPath = path.isAbsolute(whisperModelDir)
    ? whisperModelDir
    : path.join(backendDir, whisperModelDir);

  return path.join(modelPath, ".setup-complete");
}

export function isModelSetupComplete(backendDir: string): boolean {
  return fs.existsSync(resolveSetupMarkerPath(backendDir));
}

export function applySetupProgress(event: SetupProgressEvent): void {
  setSetupSnapshot({
    status: "running",
    message: event.message,
    percent: event.percent,
  });
}
