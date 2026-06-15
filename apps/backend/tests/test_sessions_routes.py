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


def _seed_closed_session() -> str:
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
            start_ms=0,
            end_ms=2500,
        )
        session_service.close_session(db, session_id=session_row.id, duration_ms=2500)
        return session_row.id


def test_list_sessions_endpoint(session_client) -> None:
    session_id = _seed_closed_session()

    response = session_client.get("/api/sessions")

    assert response.status_code == 200
    payload = response.json()
    assert payload["limit"] == 100
    assert len(payload["sessions"]) == 1
    assert payload["sessions"][0]["id"] == session_id
    assert payload["sessions"][0]["preview_text"] == "Project kickoff meeting notes"


def test_get_session_detail(session_client) -> None:
    session_id = _seed_closed_session()

    response = session_client.get(f"/api/sessions/{session_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "closed"
    assert payload["artifacts"] == []
    assert len(payload["segments"]) == 1
    assert payload["segments"][0]["speaker_label"] == "Speaker 1"
    assert payload["segments"][0]["text"] == "Project kickoff meeting notes"


def test_search_sessions_endpoint(session_client) -> None:
    _seed_closed_session()

    response = session_client.get("/api/sessions/search", params={"q": "kickoff"})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["sessions"]) == 1


def test_delete_session_endpoint(session_client) -> None:
    session_id = _seed_closed_session()

    delete_response = session_client.delete(f"/api/sessions/{session_id}")
    list_response = session_client.get("/api/sessions")

    assert delete_response.status_code == 204
    assert list_response.json()["sessions"] == []


def test_settings_persist_save_session_audio(session_client, tmp_path, monkeypatch) -> None:
    data_dir = tmp_path / "data"
    monkeypatch.setattr("app.config.resolve_session_data_dir", lambda: data_dir)
    monkeypatch.setattr(
        "app.modules.settings.store._settings_path",
        lambda: data_dir / "settings.json",
    )

    patch_response = session_client.patch(
        "/api/settings",
        json={"save_session_audio": True},
    )

    assert patch_response.status_code == 200
    assert patch_response.json()["save_session_audio"] is True
    assert (data_dir / "settings.json").is_file()

    get_response = session_client.get("/api/settings")
    assert get_response.json()["save_session_audio"] is True
