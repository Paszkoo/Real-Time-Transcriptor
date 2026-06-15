import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.db.models import JobRow, SegmentRow, SessionRow, SpeakerRow
from app.modules.sessions.errors import SessionError, SessionNotFoundError
from app.modules.sessions.fts import index_segment, remove_session_index, search_session_ids

PREVIEW_MAX_LEN = 200
DEFAULT_SPEAKER_LABEL = "Speaker 1"


class SessionService:
    def create_session(
        self,
        db: Session,
        *,
        device_name: str | None,
        source_type: str,
    ) -> SessionRow:
        session_id = str(uuid.uuid4())
        speaker_id = str(uuid.uuid4())
        now = datetime.now(UTC)

        session_row = SessionRow(
            id=session_id,
            started_at=now,
            device_name=device_name,
            source_type=source_type,
            status="active",
        )
        speaker_row = SpeakerRow(
            id=speaker_id,
            session_id=session_id,
            label=DEFAULT_SPEAKER_LABEL,
            sort_order=0,
        )
        db.add(session_row)
        db.add(speaker_row)
        db.commit()
        db.refresh(session_row)
        return session_row

    def append_segment(
        self,
        db: Session,
        *,
        session_id: str,
        text: str,
        start_ms: int,
        end_ms: int,
        speaker_id: str | None = None,
    ) -> SegmentRow:
        session_row = db.get(SessionRow, session_id)
        if session_row is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")

        if speaker_id is None:
            speaker = db.scalar(
                select(SpeakerRow)
                .where(SpeakerRow.session_id == session_id)
                .order_by(SpeakerRow.sort_order)
                .limit(1)
            )
            if speaker is None:
                raise SessionNotFoundError(f"Session '{session_id}' has no speakers.")
            speaker_id = speaker.id

        sequence = db.scalar(
            select(SegmentRow.sequence)
            .where(SegmentRow.session_id == session_id)
            .order_by(SegmentRow.sequence.desc())
            .limit(1)
        )
        next_sequence = 0 if sequence is None else sequence + 1

        segment_id = str(uuid.uuid4())
        segment_row = SegmentRow(
            id=segment_id,
            session_id=session_id,
            speaker_id=speaker_id,
            text=text.strip(),
            start_ms=start_ms,
            end_ms=end_ms,
            sequence=next_sequence,
        )
        job_row = JobRow(
            id=str(uuid.uuid4()),
            session_id=session_id,
            segment_id=segment_id,
            job_type="transcription",
            status="done",
        )

        db.add(segment_row)
        db.flush()
        db.add(job_row)
        index_segment(
            db, segment_id=segment_id, session_id=session_id, segment_text=segment_row.text
        )

        if not session_row.preview_text and segment_row.text:
            session_row.preview_text = segment_row.text[:PREVIEW_MAX_LEN]

        if not session_row.title and segment_row.text:
            session_row.title = segment_row.text[:80]

        db.commit()
        db.refresh(segment_row)
        return segment_row

    def close_session(
        self,
        db: Session,
        *,
        session_id: str,
        duration_ms: int | None = None,
        audio_path: str | None = None,
    ) -> SessionRow:
        session_row = db.get(SessionRow, session_id)
        if session_row is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")

        session_row.status = "closed"
        session_row.ended_at = datetime.now(UTC)
        session_row.duration_ms = duration_ms
        if audio_path is not None:
            session_row.audio_path = audio_path

        db.commit()
        db.refresh(session_row)
        return session_row

    def get_by_id(self, db: Session, session_id: str) -> SessionRow:
        session_row = db.scalar(
            select(SessionRow)
            .where(SessionRow.id == session_id)
            .options(
                selectinload(SessionRow.speakers),
                selectinload(SessionRow.segments).selectinload(SegmentRow.speaker),
            )
        )
        if session_row is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")
        return session_row

    def list_sessions(self, db: Session, *, limit: int | None = None) -> list[SessionRow]:
        query = (
            select(SessionRow)
            .where(SessionRow.status == "closed")
            .order_by(SessionRow.started_at.desc())
        )
        if limit is not None:
            query = query.limit(limit)
        return list(db.scalars(query).all())

    def delete_session(self, db: Session, session_id: str) -> None:
        session_row = db.get(SessionRow, session_id)
        if session_row is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")

        audio_path = session_row.audio_path

        remove_session_index(db, session_id=session_id)

        db.execute(delete(SessionRow).where(SessionRow.id == session_id))
        db.commit()

        if audio_path:
            Path(audio_path).unlink(missing_ok=True)

    def search(self, db: Session, query: str, *, limit: int | None = None) -> list[SessionRow]:
        normalized = query.strip()
        if not normalized:
            return self.list_sessions(db, limit=limit or settings.session_list_limit)

        session_ids = search_session_ids(db, normalized, limit=limit or settings.session_list_limit)
        if not session_ids:
            return []

        rows = db.scalars(
            select(SessionRow)
            .where(SessionRow.id.in_(session_ids))
            .where(SessionRow.status == "closed")
        ).all()
        row_by_id = {row.id: row for row in rows}
        return [row_by_id[session_id] for session_id in session_ids if session_id in row_by_id]

    def update_speaker_label(
        self,
        db: Session,
        *,
        session_id: str,
        speaker_id: str,
        label: str,
    ) -> SpeakerRow:
        session_row = db.get(SessionRow, session_id)
        if session_row is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")

        speaker_row = db.get(SpeakerRow, speaker_id)
        if speaker_row is None or speaker_row.session_id != session_id:
            raise SessionNotFoundError(f"Speaker '{speaker_id}' was not found.")

        normalized = label.strip()
        if not normalized:
            raise SessionError("Speaker label cannot be empty.")

        speaker_row.label = normalized
        db.commit()
        db.refresh(speaker_row)
        return speaker_row


session_service = SessionService()
