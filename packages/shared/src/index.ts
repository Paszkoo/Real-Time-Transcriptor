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
  is_paused: boolean;
  device_id: number | null;
  device_name: string | null;
  source_type: CaptureSourceType;
  session_id: string | null;
  started_at: string | null;
  elapsed_ms: number;
  audio_level: number;
  vad_active: boolean;
  chunks_emitted: number;
  chunks_filtered: number;
  queue_size: number;
}

export interface UpdateSpeakerRequest {
  label: string;
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

export interface LiveTranscriptSegment extends TranscriptSegment {
  is_final: boolean;
  confidence: number | null;
  alternatives: string[];
}

export type TranscriptStreamEvent =
  | { type: "segment"; segment: LiveTranscriptSegment }
  | { type: "speaker_updated"; speaker: Speaker }
  | { type: "closed" }
  | { type: "error"; code: string; message: string };

export interface SessionArtifact {
  artifact_type: string;
  content: string;
  updated_at: string;
}

export type LlmTask = "correct" | "summarize" | "extract_todos";
export type SummaryFormat = "bullets" | "narrative";

export interface ProcessSessionRequest {
  task: LlmTask;
  format?: SummaryFormat;
}

export interface ProcessSessionResponse {
  job_id: string;
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
  artifacts: SessionArtifact[];
}

export interface SessionsListResponse {
  sessions: SessionSummary[];
  limit: number;
}

export interface AppSettings {
  save_session_audio: boolean;
  whisper_model_name: string;
  ollama_model: string;
  device: "cpu" | "cuda";
  audio_sample_rate: number;
  audio_chunk_duration_s: number;
  audio_chunk_overlap_s: number;
  vad_enabled: boolean;
  vad_threshold: number;
  default_audio_device_id: number | null;
  transcription_language: TranscriptionLanguage;
  default_export_formats: SessionExportFormat[];
}

export interface AppSettingsUpdateRequest {
  save_session_audio?: boolean;
  whisper_model_name?: string;
  ollama_model?: string;
  device?: "cpu" | "cuda";
  audio_sample_rate?: number;
  audio_chunk_duration_s?: number;
  audio_chunk_overlap_s?: number;
  vad_enabled?: boolean;
  vad_threshold?: number;
  default_audio_device_id?: number | null;
  transcription_language?: TranscriptionLanguage;
  default_export_formats?: SessionExportFormat[];
}

export type TranscriptionLanguage = "auto" | "pl" | "en" | "de" | "fr" | "es" | "it" | "uk";

export type SessionExportFormat = "pdf" | "docx" | "txt" | "srt" | "vtt" | "json";

export type SettingsTab = "audio" | "models" | "export" | "advanced";

export interface DesktopSettings {
  last_settings_tab: SettingsTab;
}

export interface DesktopSettingsUpdateRequest {
  last_settings_tab?: SettingsTab;
}

export interface WhisperModelOption {
  id: string;
  label: string;
  size_gb: number;
  vram_gb: number | null;
}

export interface WhisperModelsResponse {
  models: WhisperModelOption[];
  active_model: string;
}

export interface OllamaModelInfo {
  name: string;
  size: number | null;
}

export interface OllamaModelsResponse {
  available: boolean;
  models: OllamaModelInfo[];
  active_model: string;
}

export interface DiagnosticsInfo {
  app_version: string;
  backend_version: string;
  whisper_model_name: string;
  whisper_model_loaded: boolean;
  ollama_model: string;
  ollama_available: boolean;
  device: string;
  vram_total_mb: number | null;
  vram_free_mb: number | null;
  audio_devices_count: number;
}

export interface DiagnosticIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  suggestion: string;
}

export interface DiagnosticsCheckResponse {
  issues: DiagnosticIssue[];
}

export const TRANSCRIPTION_LANGUAGE_OPTIONS: { value: TranscriptionLanguage; label: string }[] = [
  { value: "auto", label: "Automatic" },
  { value: "pl", label: "Polish" },
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "uk", label: "Ukrainian" },
];

export const DEFAULT_BACKEND_PORT = 8765;
export const HEALTH_POLL_INTERVAL_MS = 2000;
export const CAPTURE_STATUS_POLL_INTERVAL_MS = 1000;
