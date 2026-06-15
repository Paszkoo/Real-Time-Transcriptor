from datetime import datetime
from typing import Literal

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


class SessionArtifactResponse(BaseModel):
    artifact_type: str
    content: str
    updated_at: datetime


class ProcessSessionResponse(BaseModel):
    job_id: str


class ProcessSessionRequest(BaseModel):
    task: Literal["correct", "summarize", "extract_todos"]
    format: Literal["bullets", "narrative"] = "bullets"


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
    artifacts: list[SessionArtifactResponse]


class SessionsListResponse(BaseModel):
    sessions: list[SessionSummaryResponse]
    limit: int


class AppSettingsResponse(BaseModel):
    save_session_audio: bool


class AppSettingsUpdateRequest(BaseModel):
    save_session_audio: bool | None = None
