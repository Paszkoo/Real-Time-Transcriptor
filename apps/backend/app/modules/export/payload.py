from dataclasses import dataclass
from datetime import datetime

from app.db.models import SessionArtifactRow, SessionRow
from app.modules.sessions.mapping import sorted_session_parts


@dataclass(frozen=True)
class ExportSegment:
    id: str
    speaker_id: str
    speaker_label: str
    text: str
    start_ms: int
    end_ms: int
    sequence: int


@dataclass(frozen=True)
class ExportArtifact:
    artifact_type: str
    content: str
    updated_at: datetime


@dataclass(frozen=True)
class ExportSpeaker:
    id: str
    label: str
    sort_order: int


@dataclass(frozen=True)
class ExportSessionData:
    id: str
    title: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_ms: int | None
    device_name: str | None
    source_type: str
    status: str
    speakers: list[ExportSpeaker]
    segments: list[ExportSegment]
    artifacts: list[ExportArtifact]
    backend_version: str

    @property
    def display_title(self) -> str:
        return self.title or "Untitled session"

    @property
    def summary_text(self) -> str | None:
        by_type = {artifact.artifact_type: artifact.content for artifact in self.artifacts}
        narrative = by_type.get("summarize_narrative")
        if narrative:
            return narrative
        bullets = by_type.get("summarize_bullets")
        return bullets or None


def build_export_payload(
    session_row: SessionRow,
    artifacts: list[SessionArtifactRow],
    *,
    backend_version: str,
) -> ExportSessionData:
    speakers, speaker_labels, segments = sorted_session_parts(session_row)

    return ExportSessionData(
        id=session_row.id,
        title=session_row.title,
        started_at=session_row.started_at,
        ended_at=session_row.ended_at,
        duration_ms=session_row.duration_ms,
        device_name=session_row.device_name,
        source_type=session_row.source_type,
        status=session_row.status,
        speakers=[
            ExportSpeaker(id=speaker.id, label=speaker.label, sort_order=speaker.sort_order)
            for speaker in speakers
        ],
        segments=[
            ExportSegment(
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
        artifacts=[
            ExportArtifact(
                artifact_type=artifact.artifact_type,
                content=artifact.content,
                updated_at=artifact.updated_at,
            )
            for artifact in artifacts
        ],
        backend_version=backend_version,
    )


def sanitize_filename(title: str, extension: str) -> str:
    safe = "".join(char if char.isalnum() or char in (" ", "-", "_") else "_" for char in title)
    safe = "_".join(safe.split()).strip("_") or "session"
    return f"{safe[:80]}.{extension}"
