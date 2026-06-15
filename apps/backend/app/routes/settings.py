from fastapi import APIRouter, Header
from rtt_shared.settings import (
    AppSettingsResponse,
    AppSettingsUpdateRequest,
    DiagnosticsCheckResponse,
    DiagnosticsResponse,
    OllamaModelsResponse,
    WhisperModelsResponse,
)

from app.modules.settings.diagnostics import get_diagnostics, run_diagnostics_check
from app.modules.settings.model_catalog import list_whisper_model_responses
from app.modules.settings.ollama_models import fetch_ollama_models
from app.modules.settings.runtime import runtime_settings
from app.modules.settings.service import to_settings_response, update_settings

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=AppSettingsResponse)
def get_settings() -> AppSettingsResponse:
    return to_settings_response()


@router.patch("/settings", response_model=AppSettingsResponse)
def patch_settings(body: AppSettingsUpdateRequest) -> AppSettingsResponse:
    return update_settings(body)


@router.get("/settings/whisper-models", response_model=WhisperModelsResponse)
def get_whisper_models() -> WhisperModelsResponse:
    return WhisperModelsResponse(
        models=list_whisper_model_responses(),
        active_model=runtime_settings.whisper_model_name,
    )


@router.get("/settings/ollama/models", response_model=OllamaModelsResponse)
async def get_ollama_models() -> OllamaModelsResponse:
    return await fetch_ollama_models()


@router.get("/settings/diagnostics", response_model=DiagnosticsResponse)
async def get_settings_diagnostics(
    x_app_version: str | None = Header(default=None, alias="X-App-Version"),
) -> DiagnosticsResponse:
    return await get_diagnostics(x_app_version or "0.1.0")


@router.post("/settings/diagnostics/check", response_model=DiagnosticsCheckResponse)
async def check_settings_diagnostics(
    x_app_version: str | None = Header(default=None, alias="X-App-Version"),
) -> DiagnosticsCheckResponse:
    return await run_diagnostics_check(x_app_version or "0.1.0")
