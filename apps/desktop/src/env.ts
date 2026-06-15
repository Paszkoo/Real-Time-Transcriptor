import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { app } from "electron";

import { resolveRepoRootFromMain } from "./paths";

export function resolveRepoRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "..");
  }

  return resolveRepoRootFromMain(__dirname);
}

export function loadEnvironment(): void {
  const repoRoot = resolveRepoRoot();
  const envPath = path.join(repoRoot, ".env");

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export function getBackendHost(): string {
  return process.env.BACKEND_HOST ?? "127.0.0.1";
}

export function getBackendPort(): number {
  const raw = process.env.BACKEND_PORT ?? "8765";
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 8765 : parsed;
}

export function getWhisperModelDir(): string {
  return process.env.WHISPER_MODEL_DIR ?? "./models/whisper";
}

export function shouldRunModelSetupOnStart(): boolean {
  return process.env.RUN_MODEL_SETUP_ON_START === "true";
}

export function shouldOpenDevTools(): boolean {
  return process.env.OPEN_DEVTOOLS === "true";
}

export function getHealthCheckHost(): string {
  const host = getBackendHost();
  if (host === "0.0.0.0" || host === "::") {
    return "127.0.0.1";
  }

  return host;
}
