from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy.orm import Session

from app.db.engine import get_engine
from app.db.models import SegmentRow, SpeakerRow
from app.modules.sessions.service import session_service

logger = logging.getLogger(__name__)


def _segment_event(
    *,
    segment: SegmentRow,
    speaker_label: str,
    is_final: bool = True,
    confidence: float | None = None,
    alternatives: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "type": "segment",
        "segment": {
            "id": segment.id,
            "speaker_id": segment.speaker_id,
            "speaker_label": speaker_label,
            "text": segment.text,
            "start_ms": segment.start_ms,
            "end_ms": segment.end_ms,
            "sequence": segment.sequence,
            "is_final": is_final,
            "confidence": confidence,
            "alternatives": alternatives or [],
        },
    }


def _speaker_updated_event(speaker: SpeakerRow) -> dict[str, Any]:
    return {
        "type": "speaker_updated",
        "speaker": {
            "id": speaker.id,
            "label": speaker.label,
            "sort_order": speaker.sort_order,
        },
    }


class TranscriptStreamManager:
    def __init__(self) -> None:
        self._subscribers: dict[str, list[asyncio.Queue[dict[str, Any]]]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, session_id: str) -> asyncio.Queue[dict[str, Any]]:
        engine = get_engine()
        with Session(engine) as db:
            session_row = session_service.get_by_id(db, session_id)

        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        async with self._lock:
            self._subscribers.setdefault(session_id, []).append(queue)

        speakers = {speaker.id: speaker.label for speaker in session_row.speakers}
        segments = sorted(session_row.segments, key=lambda segment: segment.sequence)
        for segment in segments:
            await queue.put(
                _segment_event(
                    segment=segment,
                    speaker_label=speakers.get(segment.speaker_id, "Speaker"),
                )
            )

        if session_row.status != "active":
            await queue.put({"type": "closed"})

        return queue

    async def unsubscribe(self, session_id: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        async with self._lock:
            subscribers = self._subscribers.get(session_id)
            if subscribers is None:
                return
            if queue in subscribers:
                subscribers.remove(queue)
            if not subscribers:
                self._subscribers.pop(session_id, None)

    async def broadcast_segment(
        self,
        *,
        session_id: str,
        segment: SegmentRow,
        speaker_label: str,
        is_final: bool = True,
        confidence: float | None = None,
        alternatives: list[str] | None = None,
    ) -> None:
        await self._broadcast(
            session_id,
            _segment_event(
                segment=segment,
                speaker_label=speaker_label,
                is_final=is_final,
                confidence=confidence,
                alternatives=alternatives,
            ),
        )

    async def broadcast_speaker_updated(self, *, session_id: str, speaker: SpeakerRow) -> None:
        await self._broadcast(session_id, _speaker_updated_event(speaker))

    async def broadcast_closed(self, session_id: str) -> None:
        await self._broadcast(session_id, {"type": "closed"})

    async def _broadcast(self, session_id: str, event: dict[str, Any]) -> None:
        async with self._lock:
            subscribers = list(self._subscribers.get(session_id, []))

        for queue in subscribers:
            try:
                await queue.put(event)
            except Exception:
                logger.debug("Failed to enqueue transcript event for session %s", session_id)


transcript_stream_manager = TranscriptStreamManager()
