from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from rtt_shared.sessions import (
    SegmentResponse,
    SessionDetailResponse,
    SessionsListResponse,
    SessionSummaryResponse,
    SpeakerResponse,
)
from sqlalchemy.orm import Session

from app.config import settings
from app.db.engine import get_db
from app.db.models import SessionRow
from app.modules.sessions.service import session_service

router = APIRouter(prefix="/api", tags=["sessions"])


def _to_summary(session_row: SessionRow) -> SessionSummaryResponse:
    return SessionSummaryResponse(
        id=session_row.id,
        title=session_row.title,
        started_at=session_row.started_at,
        ended_at=session_row.ended_at,
        duration_ms=session_row.duration_ms,
        preview_text=session_row.preview_text,
        device_name=session_row.device_name,
        source_type=session_row.source_type,
        has_audio=bool(session_row.audio_path),
    )


def _to_list_response(session_rows: list[SessionRow]) -> SessionsListResponse:
    return SessionsListResponse(
        sessions=[_to_summary(session_row) for session_row in session_rows],
        limit=settings.session_list_limit,
    )


def _to_detail(session_row: SessionRow) -> SessionDetailResponse:
    speakers = sorted(session_row.speakers, key=lambda speaker: speaker.sort_order)
    speaker_labels = {speaker.id: speaker.label for speaker in speakers}
    segments = sorted(session_row.segments, key=lambda segment: segment.sequence)

    return SessionDetailResponse(
        **_to_summary(session_row).model_dump(),
        status=session_row.status,
        audio_url=f"/api/sessions/{session_row.id}/audio" if session_row.audio_path else None,
        speakers=[
            SpeakerResponse(id=speaker.id, label=speaker.label, sort_order=speaker.sort_order)
            for speaker in speakers
        ],
        segments=[
            SegmentResponse(
                id=segment.id,
                speaker_id=segment.speaker_id,
                speaker_label=speaker_labels.get(segment.speaker_id, "Speaker"),
                text=segment.text,
                start_ms=segment.start_ms,
                end_ms=segment.end_ms,
                sequence=segment.sequence,
            )
            for segment in segments
        ],
    )


@router.get("/sessions", response_model=SessionsListResponse)
def list_sessions(db: Session = Depends(get_db)) -> SessionsListResponse:
    sessions = session_service.list_sessions(db, limit=settings.session_list_limit)
    return _to_list_response(sessions)


@router.get("/sessions/search", response_model=SessionsListResponse)
def search_sessions(
    q: str = Query(min_length=1),
    db: Session = Depends(get_db),
) -> SessionsListResponse:
    sessions = session_service.search(db, q, limit=settings.session_list_limit)
    return _to_list_response(sessions)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: str, db: Session = Depends(get_db)) -> SessionDetailResponse:
    session_row = session_service.get_by_id(db, session_id)
    return _to_detail(session_row)


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: str, db: Session = Depends(get_db)) -> None:
    session_service.delete_session(db, session_id)


@router.get("/sessions/{session_id}/audio")
def get_session_audio(session_id: str, db: Session = Depends(get_db)) -> FileResponse:
    session_row = session_service.get_by_id(db, session_id)
    if not session_row.audio_path:
        raise HTTPException(status_code=404, detail="Session has no saved audio.")

    audio_path = Path(session_row.audio_path)
    if not audio_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file is missing on disk.")

    return FileResponse(path=audio_path, media_type="audio/wav", filename=audio_path.name)
