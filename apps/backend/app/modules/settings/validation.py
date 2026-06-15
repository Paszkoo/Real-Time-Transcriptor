from app.modules.settings.errors import InvalidSettingsError
from app.modules.settings.model_catalog import is_valid_whisper_model

INFERENCE_DEVICES = frozenset({"cpu", "cuda"})
TRANSCRIPTION_LANGUAGES = frozenset({"auto", "pl", "en", "de", "fr", "es", "it", "uk"})
EXPORT_FORMAT_IDS = frozenset({"pdf", "docx", "txt", "srt", "vtt", "json"})

SAMPLE_RATE_MIN = 8000
SAMPLE_RATE_MAX = 48000
CHUNK_DURATION_MIN = 5
CHUNK_DURATION_MAX = 120
CHUNK_OVERLAP_MAX = 30
VAD_THRESHOLD_MIN = 0.0
VAD_THRESHOLD_MAX = 1.0


def normalized_inference_device(device: str) -> str:
    return device if device in INFERENCE_DEVICES else "cpu"


def try_whisper_model_name(value: object) -> str | None:
    if isinstance(value, str) and is_valid_whisper_model(value):
        return value
    return None


def require_whisper_model_name(value: str) -> str:
    if not is_valid_whisper_model(value):
        raise InvalidSettingsError(f"Unsupported Whisper model '{value}'.")
    return value


def try_ollama_model_name(value: object) -> str | None:
    if isinstance(value, str):
        model_name = value.strip()
        if model_name:
            return model_name
    return None


def require_ollama_model_name(value: str) -> str:
    model_name = value.strip()
    if not model_name:
        raise InvalidSettingsError("Ollama model name cannot be empty.")
    return model_name


def try_inference_device(value: object) -> str | None:
    if isinstance(value, str) and value in INFERENCE_DEVICES:
        return value
    return None


def require_inference_device(value: str) -> str:
    if value not in INFERENCE_DEVICES:
        raise InvalidSettingsError(f"Unsupported inference device '{value}'.")
    return value


def try_sample_rate(value: object) -> int | None:
    if isinstance(value, int) and SAMPLE_RATE_MIN <= value <= SAMPLE_RATE_MAX:
        return value
    return None


def require_sample_rate(value: int) -> int:
    if try_sample_rate(value) is None:
        raise InvalidSettingsError("Sample rate must be between 8000 and 48000 Hz.")
    return value


def try_chunk_duration(value: object) -> float | None:
    if isinstance(value, (int, float)):
        duration = float(value)
        if CHUNK_DURATION_MIN <= duration <= CHUNK_DURATION_MAX:
            return duration
    return None


def require_chunk_duration(value: float) -> float:
    if try_chunk_duration(value) is None:
        raise InvalidSettingsError("Chunk duration must be between 5 and 120 seconds.")
    return value


def try_chunk_overlap(value: object) -> float | None:
    if isinstance(value, (int, float)):
        overlap = float(value)
        if 0 <= overlap <= CHUNK_OVERLAP_MAX:
            return overlap
    return None


def require_chunk_overlap(value: float) -> float:
    if try_chunk_overlap(value) is None:
        raise InvalidSettingsError("Chunk overlap must be between 0 and 30 seconds.")
    return value


def try_vad_threshold(value: object) -> float | None:
    if isinstance(value, (int, float)):
        threshold = float(value)
        if VAD_THRESHOLD_MIN <= threshold <= VAD_THRESHOLD_MAX:
            return threshold
    return None


def require_vad_threshold(value: float) -> float:
    if try_vad_threshold(value) is None:
        raise InvalidSettingsError("VAD threshold must be between 0 and 1.")
    return value


def try_transcription_language(value: object) -> str | None:
    if isinstance(value, str) and value in TRANSCRIPTION_LANGUAGES:
        return value
    return None


def require_transcription_language(value: str) -> str:
    if value not in TRANSCRIPTION_LANGUAGES:
        raise InvalidSettingsError(f"Unsupported transcription language '{value}'.")
    return value


def try_export_formats(value: object) -> list[str] | None:
    if not isinstance(value, list):
        return None
    formats = [entry for entry in value if entry in EXPORT_FORMAT_IDS]
    return formats or None


def require_export_formats(value: list[str]) -> list[str]:
    formats = try_export_formats(value)
    if not formats:
        raise InvalidSettingsError("Select at least one valid export format.")
    return formats


def require_chunk_overlap_less_than_duration(*, overlap: float, duration: float) -> None:
    if overlap >= duration:
        raise InvalidSettingsError("Chunk overlap must be smaller than chunk duration.")
