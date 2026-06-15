from datetime import datetime

from pydantic import BaseModel


class SpeakerResponse(BaseModel):
    id: str
    label: str
    sort_order: int


class SegmentResponse(BaseModel):
    id: str
    speaker_id: str
    speaker_label: str
    text: str
    start_ms: int
    end_ms: int
    sequence: int


class SessionSummaryResponse(BaseModel):
    id: str
    title: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_ms: int | None
    preview_text: str | None
    device_name: str | None
    source_type: str
    has_audio: bool


class SessionDetailResponse(SessionSummaryResponse):
    status: str
    audio_url: str | None
    speakers: list[SpeakerResponse]
    segments: list[SegmentResponse]


class SessionsListResponse(BaseModel):
    sessions: list[SessionSummaryResponse]
    limit: int


class AppSettingsResponse(BaseModel):
    save_session_audio: bool


class AppSettingsUpdateRequest(BaseModel):
    save_session_audio: bool | None = None
