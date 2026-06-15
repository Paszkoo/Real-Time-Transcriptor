from dataclasses import dataclass, field

from app.config import settings


@dataclass
class RuntimeSettings:
    save_session_audio: bool = settings.save_session_audio
    whisper_model_name: str = settings.whisper_model_name
    ollama_model: str = settings.ollama_model
    device: str = settings.device
    audio_sample_rate: int = settings.audio_sample_rate
    audio_chunk_duration_s: float = settings.audio_chunk_duration_s
    audio_chunk_overlap_s: float = settings.audio_chunk_overlap_s
    vad_enabled: bool = settings.vad_enabled
    vad_threshold: float = settings.vad_threshold
    default_audio_device_id: int | None = None
    transcription_language: str = "auto"
    default_export_formats: list[str] = field(default_factory=lambda: ["pdf", "txt"])


runtime_settings = RuntimeSettings()
