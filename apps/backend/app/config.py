from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]


def _resolve_env_files() -> tuple[str, ...]:
    candidates = (
        REPO_ROOT / ".env",
        BACKEND_ROOT / ".env",
        Path(".env"),
    )
    return tuple(str(path) for path in candidates if path.is_file())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_resolve_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    backend_host: str = "127.0.0.1"
    backend_port: int = 8765
    whisper_model_name: str = "large-v3-turbo"
    whisper_model_dir: str = "./models/whisper"
    ollama_host: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:4b"
    device: str = "cpu"
    audio_sample_rate: int = 16000
    audio_chunk_duration_s: float = 30.0
    audio_chunk_overlap_s: float = 5.0
    vad_enabled: bool = False
    vad_threshold: float = 0.5
    ffmpeg_path: str = "ffmpeg"
    audio_chunk_queue_maxsize: int = 32
    audio_file_roots: str = ""


settings = Settings()


def resolve_whisper_model_dir() -> Path:
    path = Path(settings.whisper_model_dir)
    if path.is_absolute():
        return path
    return (BACKEND_ROOT / path).resolve()
