from fastapi import Request
from fastapi.responses import JSONResponse

from app.modules.audio.errors import AudioError
from app.modules.transcription.errors import TranscriptionError

ERROR_STATUS_CODES: dict[str, int] = {
    "device_not_found": 404,
    "device_busy": 409,
    "microphone_permission_denied": 403,
    "capture_already_running": 409,
    "capture_not_running": 409,
    "ffmpeg_not_found": 503,
    "unsupported_audio_format": 400,
    "file_not_found": 404,
    "invalid_file_path": 400,
    "audio_decode_failed": 422,
    "whisper_not_installed": 503,
    "whisper_load_failed": 503,
    "transcription_error": 500,
}


async def domain_error_handler(
    _request: Request,
    error: AudioError | TranscriptionError,
) -> JSONResponse:
    status_code = ERROR_STATUS_CODES.get(error.code, 400)
    return JSONResponse(
        status_code=status_code,
        content={"code": error.code, "message": error.message},
    )
