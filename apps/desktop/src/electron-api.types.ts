export interface SetupProgressEvent {
  message: string;
  percent: number;
}

export interface SetupErrorEvent {
  message: string;
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
  | { status: "error"; message: string };

export interface BackendStatusEvent {
  status: "restarting" | "stopped";
}

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

export interface ElectronAPI {
  getBackendPort: () => Promise<number>;
  getBackendHost: () => Promise<string>;
  getSetupState: () => Promise<SetupSnapshot>;
  onSetupStart: (callback: () => void) => () => void;
  onSetupProgress: (callback: (event: SetupProgressEvent) => void) => () => void;
  onSetupComplete: (callback: () => void) => () => void;
  onSetupError: (callback: (event: SetupErrorEvent) => void) => () => void;
  onBackendStatus: (callback: (event: BackendStatusEvent) => void) => () => void;
  saveExportFile: (request: SaveExportFileRequest) => Promise<SaveExportFileResult>;
}
