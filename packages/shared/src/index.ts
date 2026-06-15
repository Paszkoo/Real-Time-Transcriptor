export interface HealthResponse {
  status: "ok" | "degraded";
  backend_version: string;
}

export interface AudioDevice {
  id: number;
  name: string;
  sample_rate: number;
  is_default: boolean;
}

export interface DevicesListResponse {
  devices: AudioDevice[];
}

export interface CaptureStartRequest {
  device_id: number;
}

export interface CaptureStartFileRequest {
  file_path: string;
}

export type CaptureSourceType = "microphone" | "file";

export interface CaptureStatusResponse {
  is_capturing: boolean;
  device_id: number | null;
  device_name: string | null;
  source_type: CaptureSourceType;
  chunks_emitted: number;
  chunks_filtered: number;
  queue_size: number;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
}

export const DEFAULT_BACKEND_PORT = 8765;
export const HEALTH_POLL_INTERVAL_MS = 2000;
export const CAPTURE_STATUS_POLL_INTERVAL_MS = 1000;
