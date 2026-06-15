from collections.abc import Generator
from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from alembic import command
from app.config import BACKEND_ROOT, resolve_session_data_dir
from app.db.models import Base

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def _database_url() -> str:
    db_path = resolve_session_data_dir() / "sessions.db"
    return f"sqlite:///{db_path.as_posix()}"


def get_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        resolve_session_data_dir().mkdir(parents=True, exist_ok=True)
        _engine = create_engine(
            _database_url(),
            connect_args={"check_same_thread": False},
            future=True,
        )
        _register_sqlite_pragmas(_engine)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)
    return _engine


def _register_sqlite_pragmas(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    session_factory = _SessionLocal or sessionmaker(
        bind=get_engine(), autoflush=False, autocommit=False
    )
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


def ensure_fts_table(engine: Engine) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts5(
                    text,
                    session_id UNINDEXED,
                    segment_id UNINDEXED
                )
                """
            )
        )


def init_db() -> None:
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    ensure_fts_table(engine)


def run_migrations() -> None:
    alembic_ini = BACKEND_ROOT / "alembic.ini"
    if not alembic_ini.is_file():
        init_db()
        return

    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("sqlalchemy.url", _database_url())
    command.upgrade(alembic_cfg, "head")


def reset_engine_for_tests(db_path: Path) -> None:
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None
    db_path.parent.mkdir(parents=True, exist_ok=True)
    test_url = f"sqlite:///{db_path.as_posix()}"
    _engine = create_engine(test_url, connect_args={"check_same_thread": False}, future=True)
    _register_sqlite_pragmas(_engine)
    _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)
    Base.metadata.create_all(bind=_engine)
    ensure_fts_table(_engine)
