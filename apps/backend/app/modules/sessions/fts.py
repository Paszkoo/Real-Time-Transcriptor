import re

from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session


def format_fts_query(query: str) -> str | None:
    tokens = re.findall(r"\w+", query, flags=re.UNICODE)
    if not tokens:
        return None
    return " AND ".join(f'"{token}"' for token in tokens)


def index_segment(db: Session, *, segment_id: str, session_id: str, segment_text: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO segments_fts (text, session_id, segment_id)
            VALUES (:text, :session_id, :segment_id)
            """
        ),
        {"text": segment_text, "session_id": session_id, "segment_id": segment_id},
    )


def remove_session_index(db: Session, *, session_id: str) -> None:
    db.execute(
        text("DELETE FROM segments_fts WHERE session_id = :session_id"),
        {"session_id": session_id},
    )


def search_session_ids(db: Session, query: str, *, limit: int) -> list[str]:
    fts_query = format_fts_query(query)
    if fts_query is None:
        return []

    try:
        rows = db.execute(
            text(
                """
                SELECT DISTINCT session_id
                FROM segments_fts
                WHERE segments_fts MATCH :query
                LIMIT :limit
                """
            ),
            {"query": fts_query, "limit": limit},
        ).fetchall()
    except OperationalError:
        return []

    return [row[0] for row in rows]
