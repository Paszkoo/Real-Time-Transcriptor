import json
from dataclasses import fields
from pathlib import Path

from app.config import resolve_session_data_dir
from app.modules.settings.runtime import RuntimeSettings, runtime_settings
from app.modules.settings.validation import (
    try_chunk_duration,
    try_chunk_overlap,
    try_export_formats,
    try_inference_device,
    try_ollama_model_name,
    try_sample_rate,
    try_transcription_language,
    try_vad_threshold,
    try_whisper_model_name,
)


def _settings_path() -> Path:
    return resolve_session_data_dir() / "settings.json"


def _reset_runtime_settings(defaults: RuntimeSettings) -> None:
    for field in fields(RuntimeSettings):
        value = getattr(defaults, field.name)
        if isinstance(value, list):
            value = list(value)
        setattr(runtime_settings, field.name, value)


def _apply_dict(target: RuntimeSettings, data: dict) -> None:
    if isinstance(data.get("save_session_audio"), bool):
        target.save_session_audio = data["save_session_audio"]

    whisper_model = try_whisper_model_name(data.get("whisper_model_name"))
    if whisper_model is not None:
        target.whisper_model_name = whisper_model

    ollama_model = try_ollama_model_name(data.get("ollama_model"))
    if ollama_model is not None:
        target.ollama_model = ollama_model

    device = try_inference_device(data.get("device"))
    if device is not None:
        target.device = device

    sample_rate = try_sample_rate(data.get("audio_sample_rate"))
    if sample_rate is not None:
        target.audio_sample_rate = sample_rate

    chunk_duration = try_chunk_duration(data.get("audio_chunk_duration_s"))
    if chunk_duration is not None:
        target.audio_chunk_duration_s = chunk_duration

    chunk_overlap = try_chunk_overlap(data.get("audio_chunk_overlap_s"))
    if chunk_overlap is not None:
        target.audio_chunk_overlap_s = chunk_overlap

    if isinstance(data.get("vad_enabled"), bool):
        target.vad_enabled = data["vad_enabled"]

    vad_threshold = try_vad_threshold(data.get("vad_threshold"))
    if vad_threshold is not None:
        target.vad_threshold = vad_threshold

    if "default_audio_device_id" in data:
        device_id = data["default_audio_device_id"]
        target.default_audio_device_id = device_id if isinstance(device_id, int) else None

    language = try_transcription_language(data.get("transcription_language"))
    if language is not None:
        target.transcription_language = language

    export_formats = try_export_formats(data.get("default_export_formats"))
    if export_formats is not None:
        target.default_export_formats = export_formats


def load_runtime_settings() -> None:
    _reset_runtime_settings(RuntimeSettings())

    path = _settings_path()
    if not path.is_file():
        return

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return

    if isinstance(data, dict):
        _apply_dict(runtime_settings, data)


def serialize_runtime_settings() -> dict:
    return {
        "save_session_audio": runtime_settings.save_session_audio,
        "whisper_model_name": runtime_settings.whisper_model_name,
        "ollama_model": runtime_settings.ollama_model,
        "device": runtime_settings.device,
        "audio_sample_rate": runtime_settings.audio_sample_rate,
        "audio_chunk_duration_s": runtime_settings.audio_chunk_duration_s,
        "audio_chunk_overlap_s": runtime_settings.audio_chunk_overlap_s,
        "vad_enabled": runtime_settings.vad_enabled,
        "vad_threshold": runtime_settings.vad_threshold,
        "default_audio_device_id": runtime_settings.default_audio_device_id,
        "transcription_language": runtime_settings.transcription_language,
        "default_export_formats": runtime_settings.default_export_formats,
    }


def save_runtime_settings() -> None:
    data_dir = resolve_session_data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)
    _settings_path().write_text(
        json.dumps(serialize_runtime_settings(), indent=2),
        encoding="utf-8",
    )
