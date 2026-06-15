import json
import uuid
import zipfile
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.constants import BACKEND_VERSION
from app.db.engine import get_engine, reset_engine_for_tests
from app.db.models import SessionArtifactRow
from app.main import app
from app.modules.sessions.service import session_service


@pytest.fixture
def session_client(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    monkeypatch.setattr("app.config.resolve_session_data_dir", lambda: data_dir)
    monkeypatch.setattr("app.main.run_migrations", lambda: None)
    monkeypatch.setattr("app.main.load_runtime_settings", lambda: None)
    reset_engine_for_tests(data_dir / "sessions.db")

    with TestClient(app) as client:
        yield client


def _seed_export_session() -> str:
    with Session(get_engine()) as db:
        session_row = session_service.create_session(
            db,
            device_name="Desk Mic",
            source_type="microphone",
        )
        session_service.append_segment(
            db,
            session_id=session_row.id,
            text="Project kickoff meeting notes",
            start_ms=1_000,
            end_ms=4_500,
        )
        session_service.append_segment(
            db,
            session_id=session_row.id,
            text="Next steps for the release",
            start_ms=5_000,
            end_ms=8_000,
        )
        session_service.close_session(db, session_id=session_row.id, duration_ms=8_000)
        db.add(
            SessionArtifactRow(
                id=str(uuid.uuid4()),
                session_id=session_row.id,
                artifact_type="summarize_bullets",
                content="- Kickoff completed\n- Release planning started",
            )
        )
        db.commit()
        return session_row.id


@pytest.mark.parametrize(
    ("export_format", "media_type"),
    [
        ("pdf", "application/pdf"),
        ("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("txt", "text/plain; charset=utf-8"),
        ("srt", "application/x-subrip"),
        ("vtt", "text/vtt; charset=utf-8"),
        ("json", "application/json; charset=utf-8"),
    ],
)
def test_export_session_formats(session_client, export_format, media_type) -> None:
    session_id = _seed_export_session()

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": export_format},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith(media_type.split(";")[0])
    assert "attachment;" in response.headers["content-disposition"]
    assert len(response.content) > 0


def test_export_json_contains_session_payload(session_client) -> None:
    session_id = _seed_export_session()

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "json"},
    )

    payload = json.loads(response.content.decode("utf-8"))
    assert payload["id"] == session_id
    assert payload["backend_version"] == BACKEND_VERSION
    assert len(payload["segments"]) == 2
    assert payload["artifacts"][0]["artifact_type"] == "summarize_bullets"
    assert "Kickoff completed" in payload["artifacts"][0]["content"]


def test_export_srt_timestamps(session_client) -> None:
    session_id = _seed_export_session()

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "srt"},
    )

    body = response.content.decode("utf-8")
    assert "00:00:01,000 --> 00:00:04,500" in body
    assert "Speaker 1: Project kickoff meeting notes" in body


def test_export_vtt_header_and_cues(session_client) -> None:
    session_id = _seed_export_session()

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "vtt"},
    )

    body = response.content.decode("utf-8")
    assert body.startswith("WEBVTT")
    assert "00:00:05.000 --> 00:00:08.000" in body


def test_export_txt_includes_summary_and_transcript(session_client) -> None:
    session_id = _seed_export_session()

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "txt"},
    )

    body = response.content.decode("utf-8")
    assert "Summary" in body
    assert "Kickoff completed" in body
    assert "Speaker 1: Project kickoff meeting notes" in body


def test_export_pdf_is_valid_pdf(session_client) -> None:
    pytest.importorskip("reportlab")
    session_id = _seed_export_session()

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "pdf"},
    )

    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 500


def test_export_docx_is_valid_docx(session_client) -> None:
    pytest.importorskip("docx")
    session_id = _seed_export_session()

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "docx"},
    )

    with zipfile.ZipFile(BytesIO(response.content)) as archive:
        assert "word/document.xml" in archive.namelist()
        document_xml = archive.read("word/document.xml").decode("utf-8")
        assert "Project kickoff meeting notes" in document_xml
        assert "Kickoff completed" in document_xml


def test_export_unsupported_format(session_client) -> None:
    session_id = _seed_export_session()

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "csv"},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["code"] == "unsupported_export_format"


def test_export_no_transcript(session_client) -> None:
    with Session(get_engine()) as db:
        session_row = session_service.create_session(
            db,
            device_name="Desk Mic",
            source_type="microphone",
        )
        session_service.close_session(db, session_id=session_row.id, duration_ms=0)
        session_id = session_row.id

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "txt"},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["code"] == "export_no_transcript"


def test_export_content_disposition_utf8_filename(session_client) -> None:
    with Session(get_engine()) as db:
        session_row = session_service.create_session(
            db,
            device_name="Desk Mic",
            source_type="microphone",
        )
        session_row.title = "Spotkanie zespołu"
        db.commit()
        session_service.append_segment(
            db,
            session_id=session_row.id,
            text="Notatki ze spotkania",
            start_ms=0,
            end_ms=1_000,
        )
        session_service.close_session(db, session_id=session_row.id, duration_ms=1_000)
        session_id = session_row.id

    response = session_client.get(
        f"/api/sessions/{session_id}/export",
        params={"format": "txt"},
    )

    disposition = response.headers["content-disposition"]
    assert "filename*=" in disposition
    assert "UTF-8" in disposition


def test_export_missing_session(session_client) -> None:
    response = session_client.get(
        "/api/sessions/missing-session/export",
        params={"format": "txt"},
    )

    assert response.status_code == 404
    payload = response.json()
    assert payload["code"] == "session_not_found"
