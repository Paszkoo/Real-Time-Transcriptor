import pytest
from sqlalchemy.orm import Session

from app.db.engine import get_engine, reset_engine_for_tests
from app.modules.sessions.service import session_service


@pytest.fixture
def session_db(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    monkeypatch.setattr("app.config.resolve_session_data_dir", lambda: data_dir)
    reset_engine_for_tests(data_dir / "sessions.db")
    yield data_dir


def _db() -> Session:
    return Session(get_engine())


def test_create_close_and_list_session(session_db) -> None:
    with _db() as db:
        session_row = session_service.create_session(
            db,
            device_name="Test Mic",
            source_type="microphone",
        )
        session_service.append_segment(
            db,
            session_id=session_row.id,
            text="Hello world from the meeting",
            start_ms=0,
            end_ms=1200,
        )
        session_service.close_session(db, session_id=session_row.id, duration_ms=1200)

    with _db() as db:
        sessions = session_service.list_sessions(db, limit=100)

    assert len(sessions) == 1
    assert sessions[0].preview_text == "Hello world from the meeting"
    assert sessions[0].status == "closed"


def test_search_returns_matching_closed_session(session_db) -> None:
    with _db() as db:
        session_row = session_service.create_session(
            db,
            device_name="Mic",
            source_type="microphone",
        )
        session_service.append_segment(
            db,
            session_id=session_row.id,
            text="Budget review for Q3 planning",
            start_ms=0,
            end_ms=500,
        )
        session_service.close_session(db, session_id=session_row.id, duration_ms=500)

        other = session_service.create_session(db, device_name="Mic", source_type="microphone")
        session_service.append_segment(
            db,
            session_id=other.id,
            text="Weather forecast discussion",
            start_ms=0,
            end_ms=500,
        )
        session_service.close_session(db, session_id=other.id, duration_ms=500)

    with _db() as db:
        results = session_service.search(db, "budget", limit=100)

    assert len(results) == 1
    assert "Budget" in (results[0].preview_text or "")


def test_search_ignores_active_sessions(session_db) -> None:
    with _db() as db:
        active = session_service.create_session(db, device_name="Mic", source_type="microphone")
        session_service.append_segment(
            db,
            session_id=active.id,
            text="Active budget notes",
            start_ms=0,
            end_ms=300,
        )

    with _db() as db:
        results = session_service.search(db, "budget", limit=100)

    assert results == []


def test_delete_session_removes_from_list(session_db) -> None:
    with _db() as db:
        session_row = session_service.create_session(
            db,
            device_name="Mic",
            source_type="microphone",
        )
        session_service.append_segment(
            db,
            session_id=session_row.id,
            text="Temporary session",
            start_ms=0,
            end_ms=100,
        )
        session_service.close_session(db, session_id=session_row.id, duration_ms=100)
        session_service.delete_session(db, session_row.id)

    with _db() as db:
        sessions = session_service.list_sessions(db)

    assert sessions == []
