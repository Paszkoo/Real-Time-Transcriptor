from typing import Literal

from pydantic import BaseModel


class AudioDeviceResponse(BaseModel):
    id: int
    name: str
    sample_rate: float
    is_default: bool


class DevicesListResponse(BaseModel):
    devices: list[AudioDeviceResponse]


class CaptureStartRequest(BaseModel):
    device_id: int


class CaptureStartFileRequest(BaseModel):
    file_path: str


class CaptureStatusResponse(BaseModel):
    is_capturing: bool
    is_paused: bool = False
    device_id: int | None = None
    device_name: str | None = None
    source_type: Literal["microphone", "file"] = "microphone"
    session_id: str | None = None
    started_at: str | None = None
    elapsed_ms: int = 0
    audio_level: float = 0.0
    vad_active: bool = False
    chunks_emitted: int = 0
    chunks_filtered: int = 0
    queue_size: int = 0


class ErrorResponse(BaseModel):
    code: str
    message: str
