from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import BACKEND_VERSION
from app.db.models import SessionArtifactRow
from app.modules.export.errors import ExportNoTranscriptError, UnsupportedExportFormatError
from app.modules.export.formats.docx import render_docx
from app.modules.export.formats.json_format import render_json
from app.modules.export.formats.pdf import render_pdf
from app.modules.export.formats.srt import render_srt
from app.modules.export.formats.txt import render_txt
from app.modules.export.formats.vtt import render_vtt
from app.modules.export.payload import ExportSessionData, build_export_payload, sanitize_filename
from app.modules.sessions.service import session_service

_FORMAT_MEDIA_TYPES: dict[str, str] = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain; charset=utf-8",
    "srt": "application/x-subrip",
    "vtt": "text/vtt; charset=utf-8",
    "json": "application/json; charset=utf-8",
}

_RENDERERS: dict[str, Callable[[ExportSessionData], bytes]] = {
    "pdf": render_pdf,
    "docx": render_docx,
    "txt": render_txt,
    "srt": render_srt,
    "vtt": render_vtt,
    "json": render_json,
}


@dataclass(frozen=True)
class ExportResult:
    content: bytes
    filename: str
    media_type: str


class ExportService:
    SUPPORTED_FORMATS = frozenset(_FORMAT_MEDIA_TYPES)

    def export(self, db: Session, session_id: str, export_format: str) -> ExportResult:
        normalized = export_format.strip().lower()
        if normalized not in self.SUPPORTED_FORMATS:
            raise UnsupportedExportFormatError(
                f"Unsupported export format '{export_format}'. "
                f"Supported: {', '.join(sorted(self.SUPPORTED_FORMATS))}."
            )

        session_row = session_service.get_by_id(db, session_id)
        if not session_row.segments:
            raise ExportNoTranscriptError("Session has no transcript segments to export.")

        artifacts = list(
            db.scalars(
                select(SessionArtifactRow)
                .where(SessionArtifactRow.session_id == session_id)
                .order_by(SessionArtifactRow.updated_at.desc())
            ).all()
        )
        payload = build_export_payload(
            session_row,
            artifacts,
            backend_version=BACKEND_VERSION,
        )

        content = _RENDERERS[normalized](payload)
        filename = sanitize_filename(payload.display_title, normalized)
        return ExportResult(
            content=content,
            filename=filename,
            media_type=_FORMAT_MEDIA_TYPES[normalized],
        )


export_service = ExportService()
