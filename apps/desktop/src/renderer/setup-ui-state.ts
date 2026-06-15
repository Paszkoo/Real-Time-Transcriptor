import type {
  SetupProgressEvent,
  SetupSnapshot,
} from "../electron-api.types";

export type { SetupSnapshot } from "../electron-api.types";

export interface SetupUiState {
  status: "idle" | "running" | "complete" | "error" | "skipped";
  progress: { message: string; percent: number };
  hint: string | null;
}

const DEFAULT_PROGRESS = { message: "Waiting for setup…", percent: 0 };

export function createInitialSetupUiState(): SetupUiState {
  return { status: "idle", progress: DEFAULT_PROGRESS, hint: null };
}

export function setupUiFromSnapshot(snapshot: SetupSnapshot): SetupUiState {
  switch (snapshot.status) {
    case "skipped":
      return {
        status: "skipped",
        progress: DEFAULT_PROGRESS,
        hint: snapshot.hint ?? null,
      };
    case "running":
      return {
        status: "running",
        progress: {
          message: snapshot.message,
          percent: snapshot.percent,
        },
        hint: null,
      };
    case "complete":
      return {
        status: "complete",
        progress: { message: "Model setup complete.", percent: 100 },
        hint: null,
      };
    case "error":
      return {
        status: "error",
        progress: {
          message: snapshot.message,
          percent: 0,
        },
        hint: null,
      };
    default:
      return createInitialSetupUiState();
  }
}

export function setupUiFromProgress(event: SetupProgressEvent): SetupUiState {
  return {
    status: "running",
    progress: event,
    hint: null,
  };
}

export function setupUiFromStart(): SetupUiState {
  return {
    status: "running",
    progress: { message: "Starting first-run model setup…", percent: 0 },
    hint: null,
  };
}

export function setupUiFromComplete(): SetupUiState {
  return {
    status: "complete",
    progress: { message: "Model setup complete.", percent: 100 },
    hint: null,
  };
}

export function setupUiFromError(message: string, percent: number): SetupUiState {
  return {
    status: "error",
    progress: { message, percent },
    hint: null,
  };
}
