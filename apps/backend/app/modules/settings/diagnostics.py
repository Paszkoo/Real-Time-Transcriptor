import shutil
from pathlib import Path

from rtt_shared.settings import (
    DiagnosticIssueResponse,
    DiagnosticsCheckResponse,
    DiagnosticsResponse,
)

from app.config import resolve_session_data_dir, resolve_whisper_model_dir
from app.constants import BACKEND_VERSION
from app.modules.audio.capture import capture_service
from app.modules.llm.client import is_ollama_model_available
from app.modules.settings.model_catalog import is_valid_whisper_model
from app.modules.settings.ollama_models import fetch_ollama_models
from app.modules.settings.runtime import runtime_settings
from app.modules.transcription.whisper_service import whisper_service


def _query_vram_mb() -> tuple[int | None, int | None]:
    try:
        import torch
    except ImportError:
        return None, None

    if not torch.cuda.is_available():
        return None, None

    free_bytes, total_bytes = torch.cuda.mem_get_info()
    return int(total_bytes / (1024 * 1024)), int(free_bytes / (1024 * 1024))


async def get_diagnostics(app_version: str) -> DiagnosticsResponse:
    ollama = await fetch_ollama_models()
    vram_total_mb, vram_free_mb = _query_vram_mb()
    return DiagnosticsResponse(
        app_version=app_version,
        backend_version=BACKEND_VERSION,
        whisper_model_name=runtime_settings.whisper_model_name,
        whisper_model_loaded=whisper_service.is_loaded,
        ollama_model=runtime_settings.ollama_model,
        ollama_available=ollama.available,
        device=runtime_settings.device,
        vram_total_mb=vram_total_mb,
        vram_free_mb=vram_free_mb,
        audio_devices_count=len(capture_service.list_devices()),
    )


async def run_diagnostics_check(app_version: str) -> DiagnosticsCheckResponse:
    issues: list[DiagnosticIssueResponse] = []

    if not is_valid_whisper_model(runtime_settings.whisper_model_name):
        issues.append(
            DiagnosticIssueResponse(
                severity="error",
                code="invalid_whisper_model",
                message=f"Whisper model '{runtime_settings.whisper_model_name}' is not supported.",
                suggestion="Choose small, medium, or large-v3-turbo in Settings → Models.",
            )
        )

    model_dir = resolve_whisper_model_dir()
    if not model_dir.exists():
        issues.append(
            DiagnosticIssueResponse(
                severity="warning",
                code="whisper_cache_missing",
                message="Whisper model cache directory is missing.",
                suggestion="Run first-run setup or start a session to download the model.",
            )
        )

    ollama = await fetch_ollama_models()
    if not ollama.available:
        issues.append(
            DiagnosticIssueResponse(
                severity="warning",
                code="ollama_unavailable",
                message="Ollama is not reachable.",
                suggestion="Start Ollama locally or check OLLAMA_HOST in your environment.",
            )
        )
    elif ollama.models:
        tags_payload = {"models": [{"name": model.name} for model in ollama.models]}
        if not is_ollama_model_available(runtime_settings.ollama_model, tags_payload):
            issues.append(
                DiagnosticIssueResponse(
                    severity="warning",
                    code="ollama_model_missing",
                    message=f"Ollama model '{runtime_settings.ollama_model}' is not installed.",
                    suggestion=f"Run `ollama pull {runtime_settings.ollama_model}` in a terminal.",
                )
            )

    if len(capture_service.list_devices()) == 0:
        issues.append(
            DiagnosticIssueResponse(
                severity="error",
                code="no_audio_devices",
                message="No audio input devices were detected.",
                suggestion="Connect a microphone and refresh devices in Settings → Audio.",
            )
        )

    data_dir = resolve_session_data_dir()
    if not _has_free_disk_space(data_dir):
        issues.append(
            DiagnosticIssueResponse(
                severity="warning",
                code="low_disk_space",
                message="Session data directory has less than 500 MB free space.",
                suggestion="Free disk space or change SESSION_DATA_DIR.",
            )
        )

    if runtime_settings.device == "cuda":
        vram_total_mb, _ = _query_vram_mb()
        if vram_total_mb is None:
            issues.append(
                DiagnosticIssueResponse(
                    severity="warning",
                    code="cuda_unavailable",
                    message="CUDA device selected but no GPU memory was detected.",
                    suggestion="Switch inference device to CPU in Settings → Models.",
                )
            )

    if not issues:
        issues.append(
            DiagnosticIssueResponse(
                severity="info",
                code="all_clear",
                message="No issues detected.",
                suggestion="You can start recording when ready.",
            )
        )

    return DiagnosticsCheckResponse(issues=issues)


def _has_free_disk_space(path: Path, minimum_mb: int = 500) -> bool:
    target = path if path.exists() else path.parent
    try:
        usage = shutil.disk_usage(target)
    except OSError:
        return True
    return usage.free >= minimum_mb * 1024 * 1024
