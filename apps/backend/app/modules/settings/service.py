from typing import cast

from rtt_shared.settings import (
    AppSettingsResponse,
    AppSettingsUpdateRequest,
    InferenceDevice,
    SessionExportFormat,
    TranscriptionLanguage,
)

from app.modules.audio.capture import capture_service
from app.modules.settings.errors import InvalidSettingsError
from app.modules.settings.runtime import runtime_settings
from app.modules.settings.store import save_runtime_settings
from app.modules.settings.validation import (
    normalized_inference_device,
    require_chunk_duration,
    require_chunk_overlap,
    require_chunk_overlap_less_than_duration,
    require_export_formats,
    require_inference_device,
    require_ollama_model_name,
    require_sample_rate,
    require_transcription_language,
    require_vad_threshold,
    require_whisper_model_name,
)
from app.modules.transcription.whisper_service import whisper_service

CAPTURE_LOCKED_FIELDS = frozenset(
    {
        "audio_sample_rate",
        "audio_chunk_duration_s",
        "audio_chunk_overlap_s",
        "vad_enabled",
        "vad_threshold",
    }
)


def to_settings_response() -> AppSettingsResponse:
    return AppSettingsResponse(
        save_session_audio=runtime_settings.save_session_audio,
        whisper_model_name=runtime_settings.whisper_model_name,
        ollama_model=runtime_settings.ollama_model,
        device=cast(InferenceDevice, normalized_inference_device(runtime_settings.device)),
        audio_sample_rate=runtime_settings.audio_sample_rate,
        audio_chunk_duration_s=runtime_settings.audio_chunk_duration_s,
        audio_chunk_overlap_s=runtime_settings.audio_chunk_overlap_s,
        vad_enabled=runtime_settings.vad_enabled,
        vad_threshold=runtime_settings.vad_threshold,
        default_audio_device_id=runtime_settings.default_audio_device_id,
        transcription_language=cast(TranscriptionLanguage, runtime_settings.transcription_language),
        default_export_formats=cast(
            list[SessionExportFormat], runtime_settings.default_export_formats
        ),
    )


def _ensure_capture_allows(updates: dict) -> None:
    if not capture_service.is_capturing():
        return

    blocked = CAPTURE_LOCKED_FIELDS & updates.keys()
    if blocked:
        raise InvalidSettingsError("Stop recording before changing audio pipeline settings.")


def update_settings(body: AppSettingsUpdateRequest) -> AppSettingsResponse:
    updates = body.model_dump(exclude_unset=True)
    _ensure_capture_allows(updates)
    whisper_changed = False
    device_changed = False

    if "save_session_audio" in updates:
        runtime_settings.save_session_audio = updates["save_session_audio"]

    if "whisper_model_name" in updates:
        model_name = require_whisper_model_name(updates["whisper_model_name"])
        if model_name != runtime_settings.whisper_model_name:
            whisper_changed = True
            runtime_settings.whisper_model_name = model_name

    if "ollama_model" in updates:
        runtime_settings.ollama_model = require_ollama_model_name(updates["ollama_model"])

    if "device" in updates:
        device = require_inference_device(updates["device"])
        if device != runtime_settings.device:
            device_changed = True
        runtime_settings.device = device

    if "audio_sample_rate" in updates:
        runtime_settings.audio_sample_rate = require_sample_rate(updates["audio_sample_rate"])

    if "audio_chunk_duration_s" in updates:
        runtime_settings.audio_chunk_duration_s = require_chunk_duration(
            updates["audio_chunk_duration_s"]
        )

    if "audio_chunk_overlap_s" in updates:
        runtime_settings.audio_chunk_overlap_s = require_chunk_overlap(
            updates["audio_chunk_overlap_s"]
        )

    if "vad_enabled" in updates:
        runtime_settings.vad_enabled = updates["vad_enabled"]

    if "vad_threshold" in updates:
        runtime_settings.vad_threshold = require_vad_threshold(updates["vad_threshold"])

    if any(field in updates for field in ("audio_chunk_duration_s", "audio_chunk_overlap_s")):
        require_chunk_overlap_less_than_duration(
            overlap=runtime_settings.audio_chunk_overlap_s,
            duration=runtime_settings.audio_chunk_duration_s,
        )

    if "default_audio_device_id" in updates:
        runtime_settings.default_audio_device_id = updates["default_audio_device_id"]

    if "transcription_language" in updates:
        runtime_settings.transcription_language = require_transcription_language(
            updates["transcription_language"]
        )

    if "default_export_formats" in updates:
        runtime_settings.default_export_formats = require_export_formats(
            updates["default_export_formats"]
        )

    if whisper_changed or device_changed:
        whisper_service.request_reload(defer=capture_service.is_capturing())

    save_runtime_settings()
    return to_settings_response()
