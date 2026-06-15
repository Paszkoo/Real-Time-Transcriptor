from collections.abc import Awaitable, Callable

from fastapi import APIRouter
from rtt_shared.audio import (
    AudioDeviceResponse,
    CaptureStartFileRequest,
    CaptureStartRequest,
    CaptureStatusResponse,
    DevicesListResponse,
)

from app.modules.audio.capture import capture_service
from app.modules.audio.source import AudioDeviceInfo
from app.modules.sessions.recording_coordinator import recording_coordinator

router = APIRouter(prefix="/api", tags=["audio"])


def _to_device_response(device: AudioDeviceInfo) -> AudioDeviceResponse:
    return AudioDeviceResponse(
        id=device.id,
        name=device.name,
        sample_rate=device.sample_rate,
        is_default=device.is_default,
    )


def _with_session_context(status: CaptureStatusResponse) -> CaptureStatusResponse:
    return recording_coordinator.enrich_capture_status(status)


async def _start_with_recording_session(
    start_capture: Callable[[], Awaitable[CaptureStatusResponse]],
) -> CaptureStatusResponse:
    status = await start_capture()
    try:
        await recording_coordinator.on_capture_started(
            device_name=status.device_name,
            source_type=status.source_type,
        )
    except Exception:
        await capture_service.stop()
        raise
    return _with_session_context(status)


@router.get("/devices", response_model=DevicesListResponse)
def list_devices() -> DevicesListResponse:
    devices = capture_service.list_devices()
    return DevicesListResponse(devices=[_to_device_response(device) for device in devices])


@router.post("/capture/start", response_model=CaptureStatusResponse)
async def start_capture(body: CaptureStartRequest) -> CaptureStatusResponse:
    return await _start_with_recording_session(
        lambda: capture_service.start(body.device_id),
    )


@router.post("/capture/start/file", response_model=CaptureStatusResponse)
async def start_file_capture(body: CaptureStartFileRequest) -> CaptureStatusResponse:
    return await _start_with_recording_session(
        lambda: capture_service.start_file(body.file_path),
    )


@router.post("/capture/pause", response_model=CaptureStatusResponse)
async def pause_capture() -> CaptureStatusResponse:
    status = await capture_service.pause()
    return _with_session_context(status)


@router.post("/capture/resume", response_model=CaptureStatusResponse)
async def resume_capture() -> CaptureStatusResponse:
    status = await capture_service.resume()
    return _with_session_context(status)


@router.post("/capture/stop", response_model=CaptureStatusResponse)
async def stop_capture() -> CaptureStatusResponse:
    status = await capture_service.stop()
    await recording_coordinator.on_capture_stopped()
    return _with_session_context(status)


@router.get("/capture/status", response_model=CaptureStatusResponse)
def capture_status() -> CaptureStatusResponse:
    return _with_session_context(capture_service.get_status())
