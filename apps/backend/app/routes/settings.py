from fastapi import APIRouter
from rtt_shared.sessions import AppSettingsResponse, AppSettingsUpdateRequest

from app.modules.settings.runtime import runtime_settings
from app.modules.settings.store import save_runtime_settings

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=AppSettingsResponse)
def get_settings() -> AppSettingsResponse:
    return AppSettingsResponse(save_session_audio=runtime_settings.save_session_audio)


@router.patch("/settings", response_model=AppSettingsResponse)
def update_settings(body: AppSettingsUpdateRequest) -> AppSettingsResponse:
    if body.save_session_audio is not None:
        runtime_settings.save_session_audio = body.save_session_audio
        save_runtime_settings()
    return AppSettingsResponse(save_session_audio=runtime_settings.save_session_audio)
