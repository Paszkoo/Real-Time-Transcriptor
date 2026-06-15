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

router = APIRouter(prefix="/api", tags=["audio"])


def _to_device_response(device: AudioDeviceInfo) -> AudioDeviceResponse:
    return AudioDeviceResponse(
        id=device.id,
        name=device.name,
        sample_rate=device.sample_rate,
        is_default=device.is_default,
    )


@router.get("/devices", response_model=DevicesListResponse)
def list_devices() -> DevicesListResponse:
    devices = capture_service.list_devices()
    return DevicesListResponse(devices=[_to_device_response(device) for device in devices])


@router.post("/capture/start", response_model=CaptureStatusResponse)
async def start_capture(body: CaptureStartRequest) -> CaptureStatusResponse:
    return await capture_service.start(body.device_id)


@router.post("/capture/start/file", response_model=CaptureStatusResponse)
async def start_file_capture(body: CaptureStartFileRequest) -> CaptureStatusResponse:
    return await capture_service.start_file(body.file_path)


@router.post("/capture/stop", response_model=CaptureStatusResponse)
async def stop_capture() -> CaptureStatusResponse:
    return await capture_service.stop()


@router.get("/capture/status", response_model=CaptureStatusResponse)
def capture_status() -> CaptureStatusResponse:
    return capture_service.get_status()
