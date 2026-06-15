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

export interface Speaker {
  id: string;
  label: string;
  sort_order: number;
}

export interface TranscriptSegment {
  id: string;
  speaker_id: string;
  speaker_label: string;
  text: string;
  start_ms: number;
  end_ms: number;
  sequence: number;
}

export interface SessionSummary {
  id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  preview_text: string | null;
  device_name: string | null;
  source_type: CaptureSourceType;
  has_audio: boolean;
}

export interface SessionDetail extends SessionSummary {
  status: string;
  audio_url: string | null;
  speakers: Speaker[];
  segments: TranscriptSegment[];
}

export interface SessionsListResponse {
  sessions: SessionSummary[];
  limit: number;
}

export interface AppSettings {
  save_session_audio: boolean;
}

export interface AppSettingsUpdateRequest {
  save_session_audio?: boolean;
}

export const DEFAULT_BACKEND_PORT = 8765;
export const HEALTH_POLL_INTERVAL_MS = 2000;
export const CAPTURE_STATUS_POLL_INTERVAL_MS = 1000;
