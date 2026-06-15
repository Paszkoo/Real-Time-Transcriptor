import type { DesktopSettings, DesktopSettingsUpdateRequest } from "@real-time-transcriptor/shared";

export interface SaveExportFileFilter {
  name: string;
  extensions: string[];
}

export interface SaveExportFileRequest {
  defaultPath: string;
  filters: SaveExportFileFilter[];
  data: ArrayBuffer;
}

export interface SaveExportFileResult {
  canceled: boolean;
  filePath?: string;
}

export interface SetupProgressEvent {
  message: string;
  percent: number;
}

export interface SetupErrorEvent {
  message: string;
  kind?: "generic" | "ollama-missing" | "ollama-unreachable";
}

export interface SetupSkippedState {
  status: "skipped";
  reason: "already-complete" | "disabled";
  hint?: string;
}

export type SetupSnapshot =
  | { status: "idle" }
  | SetupSkippedState
  | { status: "running"; message: string; percent: number }
  | { status: "complete" }
  | { status: "error"; message: string }
  | { status: "ollama-missing"; message: string }
  | { status: "ollama-unreachable"; message: string };

export interface BackendStatusEvent {
  status: "restarting" | "stopped";
}

export type UpdateStatus =
  | { status: "checking" }
  | { status: "idle" }
  | { status: "available"; version: string }
  | { status: "ready"; version: string }
  | { status: "error"; message: string };

export interface UpdateProgressEvent {
  percent: number;
  transferred: number;
  total: number;
}

export interface ElectronAPI {
  getBackendPort: () => Promise<number>;
  getBackendHost: () => Promise<string>;
  getSetupState: () => Promise<SetupSnapshot>;
  onSetupStart: (callback: () => void) => () => void;
  onSetupProgress: (callback: (event: SetupProgressEvent) => void) => () => void;
  onSetupComplete: (callback: () => void) => () => void;
  onSetupError: (callback: (event: SetupErrorEvent) => void) => () => void;
  onSetupOllamaMissing: (callback: (event: SetupErrorEvent) => void) => () => void;
  onSetupOllamaUnreachable: (callback: (event: SetupErrorEvent) => void) => () => void;
  onBackendStatus: (callback: (event: BackendStatusEvent) => void) => () => void;
  onUpdateStatus: (callback: (event: UpdateStatus) => void) => () => void;
  onUpdateProgress: (callback: (event: UpdateProgressEvent) => void) => () => void;
  saveExportFile: (request: SaveExportFileRequest) => Promise<SaveExportFileResult>;
  getDesktopSettings: () => Promise<DesktopSettings>;
  patchDesktopSettings: (update: DesktopSettingsUpdateRequest) => Promise<DesktopSettings>;
  getAppVersion: () => Promise<string>;
  openExternalUrl: (url: string) => Promise<void>;
  retryModelSetup: () => Promise<SetupSnapshot>;
  installAppUpdate: () => Promise<void>;
}
