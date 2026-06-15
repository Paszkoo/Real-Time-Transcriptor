import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.engine import get_engine, reset_engine_for_tests
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


def _seed_closed_session(text: str = "Project kickoff meeting notes") -> str:
    with Session(get_engine()) as db:
        session_row = session_service.create_session(
            db,
            device_name="Desk Mic",
            source_type="microphone",
        )
        session_service.append_segment(
            db,
            session_id=session_row.id,
            text=text,
            start_ms=0,
            end_ms=2500,
        )
        session_service.close_session(db, session_id=session_row.id, duration_ms=2500)
        return session_row.id


def _seed_active_session() -> str:
    with Session(get_engine()) as db:
        session_row = session_service.create_session(
            db,
            device_name="Desk Mic",
            source_type="microphone",
        )
        session_service.append_segment(
            db,
            session_id=session_row.id,
            text="Still recording",
            start_ms=0,
            end_ms=1000,
        )
        return session_row.id


def test_process_session_returns_job_id(session_client, monkeypatch) -> None:
    session_id = _seed_closed_session()
    captured: dict[str, str] = {}

    async def fake_start_job(**kwargs):
        captured.update(kwargs)
        return "job-123"

    monkeypatch.setattr(
        "app.routes.llm.llm_job_manager.start_job",
        fake_start_job,
    )

    response = session_client.post(
        f"/api/sessions/{session_id}/process",
        json={"task": "summarize", "format": "bullets"},
    )

    assert response.status_code == 200
    assert response.json() == {"job_id": "job-123"}
    assert captured["session_id"] == session_id
    assert captured["task"] == "summarize"
    assert captured["summary_format"] == "bullets"


def test_process_session_rejects_active_session(session_client) -> None:
    session_id = _seed_active_session()

    response = session_client.post(
        f"/api/sessions/{session_id}/process",
        json={"task": "correct"},
    )

    assert response.status_code == 409
    assert response.json()["code"] == "session_not_closed"


def test_process_session_validates_task(session_client) -> None:
    session_id = _seed_closed_session()

    response = session_client.post(
        f"/api/sessions/{session_id}/process",
        json={"task": "invalid"},
    )

    assert response.status_code == 422
