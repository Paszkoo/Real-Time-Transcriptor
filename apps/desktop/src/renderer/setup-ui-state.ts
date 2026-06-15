import type { SetupProgressEvent, SetupSnapshot } from "../electron-api.types";

export type { SetupSnapshot } from "../electron-api.types";

export interface SetupUiState {
  status:
    | "idle"
    | "running"
    | "complete"
    | "error"
    | "skipped"
    | "ollama-missing"
    | "ollama-unreachable";
  progress: { message: string; percent: number };
  hint: string | null;
}

type SetupMessageStatus = Extract<
  SetupUiState["status"],
  "error" | "ollama-missing" | "ollama-unreachable"
>;

const DEFAULT_PROGRESS = { message: "Waiting for setup…", percent: 0 };

export function createInitialSetupUiState(): SetupUiState {
  return { status: "idle", progress: DEFAULT_PROGRESS, hint: null };
}

function setupUiFromMessage(
  status: SetupMessageStatus,
  message: string,
  percent = 0,
): SetupUiState {
  return {
    status,
    progress: { message, percent },
    hint: null,
  };
}

export function isSetupBlockingCapture(status: SetupUiState["status"]): boolean {
  return (
    status === "running" ||
    status === "error" ||
    status === "ollama-missing" ||
    status === "ollama-unreachable"
  );
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
    case "ollama-missing":
    case "ollama-unreachable":
      return setupUiFromMessage(snapshot.status, snapshot.message);
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
  return setupUiFromMessage("error", message, percent);
}

export function setupUiFromOllamaMissing(message: string): SetupUiState {
  return setupUiFromMessage("ollama-missing", message);
}

export function setupUiFromOllamaUnreachable(message: string): SetupUiState {
  return setupUiFromMessage("ollama-unreachable", message);
}
