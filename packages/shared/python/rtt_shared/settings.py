from typing import Literal

from pydantic import BaseModel, Field

TranscriptionLanguage = Literal["auto", "pl", "en", "de", "fr", "es", "it", "uk"]
SessionExportFormat = Literal["pdf", "docx", "txt", "srt", "vtt", "json"]
InferenceDevice = Literal["cpu", "cuda"]


class AppSettingsResponse(BaseModel):
    save_session_audio: bool
    whisper_model_name: str
    ollama_model: str
    device: InferenceDevice
    audio_sample_rate: int
    audio_chunk_duration_s: float
    audio_chunk_overlap_s: float
    vad_enabled: bool
    vad_threshold: float
    default_audio_device_id: int | None
    transcription_language: TranscriptionLanguage
    default_export_formats: list[SessionExportFormat] = Field(default_factory=lambda: ["pdf", "txt"])


class AppSettingsUpdateRequest(BaseModel):
    save_session_audio: bool | None = None
    whisper_model_name: str | None = None
    ollama_model: str | None = None
    device: InferenceDevice | None = None
    audio_sample_rate: int | None = None
    audio_chunk_duration_s: float | None = None
    audio_chunk_overlap_s: float | None = None
    vad_enabled: bool | None = None
    vad_threshold: float | None = None
    default_audio_device_id: int | None = None
    transcription_language: TranscriptionLanguage | None = None
    default_export_formats: list[SessionExportFormat] | None = None


class WhisperModelOptionResponse(BaseModel):
    id: str
    label: str
    size_gb: float
    vram_gb: float | None


class WhisperModelsResponse(BaseModel):
    models: list[WhisperModelOptionResponse]
    active_model: str


class OllamaModelResponse(BaseModel):
    name: str
    size: int | None = None


class OllamaModelsResponse(BaseModel):
    available: bool
    models: list[OllamaModelResponse]
    active_model: str


class DiagnosticsResponse(BaseModel):
    app_version: str
    backend_version: str
    whisper_model_name: str
    whisper_model_loaded: bool
    ollama_model: str
    ollama_available: bool
    device: str
    vram_total_mb: int | None
    vram_free_mb: int | None
    audio_devices_count: int


class DiagnosticIssueResponse(BaseModel):
    severity: Literal["error", "warning", "info"]
    code: str
    message: str
    suggestion: str


class DiagnosticsCheckResponse(BaseModel):
    issues: list[DiagnosticIssueResponse]
