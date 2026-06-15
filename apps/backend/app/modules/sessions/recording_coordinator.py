import asyncio
import logging
import math
from typing import NamedTuple

import numpy as np
from rtt_shared.audio import CaptureStatusResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db.engine import get_engine
from app.db.models import SegmentRow, SessionRow
from app.modules.audio.capture import capture_service
from app.modules.sessions.audio_writer import SessionAudioWriter
from app.modules.sessions.errors import SessionAlreadyActiveError
from app.modules.sessions.service import session_service
from app.modules.sessions.transcript_stream import transcript_stream_manager
from app.modules.settings.runtime import runtime_settings
from app.modules.transcription.whisper_service import whisper_service

logger = logging.getLogger(__name__)

CHUNK_POLL_TIMEOUT_S = 1.0


class PendingSegmentBroadcast(NamedTuple):
    segment_row: SegmentRow
    speaker_label: str
    confidence: float | None


class RecordingCoordinator:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._worker_task: asyncio.Task[None] | None = None
        self._active_session_id: str | None = None
        self._active_session_started_at: str | None = None
        self._audio_writer: SessionAudioWriter | None = None
        self._timeline_offset_ms = 0

    @property
    def active_session_id(self) -> str | None:
        return self._active_session_id

    def enrich_capture_status(self, status: CaptureStatusResponse) -> CaptureStatusResponse:
        if self._active_session_id is None:
            return status

        return status.model_copy(
            update={
                "session_id": self._active_session_id,
                "started_at": self._active_session_started_at,
            }
        )

    async def on_capture_started(
        self,
        *,
        device_name: str | None,
        source_type: str,
    ) -> SessionRow:
        async with self._lock:
            if self._active_session_id is not None:
                raise SessionAlreadyActiveError("A recording session is already active.")

            engine = get_engine()
            with Session(engine) as db:
                session_row = session_service.create_session(
                    db,
                    device_name=device_name,
                    source_type=source_type,
                )

            self._active_session_id = session_row.id
            self._active_session_started_at = session_row.started_at.isoformat()
            self._audio_writer = (
                SessionAudioWriter() if runtime_settings.save_session_audio else None
            )
            self._timeline_offset_ms = 0
            self._worker_task = asyncio.create_task(self._transcription_loop(session_row.id))
            return session_row

    async def on_capture_stopped(self) -> SessionRow | None:
        async with self._lock:
            session_id = self._active_session_id
            if session_id is None:
                return None

            if self._worker_task is not None:
                try:
                    await self._worker_task
                except Exception:
                    logger.exception("Transcription worker failed while stopping capture")

            audio_path = None
            duration_ms = self._timeline_offset_ms
            if self._audio_writer is not None:
                duration_ms = max(duration_ms, self._audio_writer.duration_ms)
                if runtime_settings.save_session_audio:
                    audio_path = self._audio_writer.save(session_id)

            engine = get_engine()
            with Session(engine) as db:
                session_row = session_service.close_session(
                    db,
                    session_id=session_id,
                    duration_ms=duration_ms or None,
                    audio_path=audio_path,
                )

            await transcript_stream_manager.broadcast_closed(session_id)

            self._active_session_id = None
            self._active_session_started_at = None
            self._audio_writer = None
            self._worker_task = None
            self._timeline_offset_ms = 0
            return session_row

    async def _transcription_loop(self, session_id: str) -> None:
        try:
            while True:
                chunk = await capture_service.pop_chunk(timeout=CHUNK_POLL_TIMEOUT_S)
                if chunk is None:
                    status = capture_service.get_status()
                    if not status.is_capturing and status.queue_size == 0:
                        break
                    continue

                if self._audio_writer is not None:
                    self._audio_writer.append(chunk)

                chunk_start_ms = self._timeline_offset_ms
                chunk_duration_ms = int(chunk.size / settings.audio_sample_rate * 1000)
                self._timeline_offset_ms += chunk_duration_ms

                await self._transcribe_chunk(session_id, chunk, chunk_start_ms)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Transcription loop failed for session %s", session_id)

    async def _transcribe_chunk(
        self, session_id: str, chunk: np.ndarray, chunk_start_ms: int
    ) -> None:
        try:
            await whisper_service.ensure_loaded_async()
        except Exception as error:
            logger.warning("Whisper unavailable for session %s: %s", session_id, error)
            return

        model = whisper_service.get_model()

        def _run_transcription() -> list[tuple[str, int, int, float | None]]:
            segments, _info = model.transcribe(
                chunk,
                beam_size=1,
                language=None,
                vad_filter=False,
            )
            results: list[tuple[str, int, int, float | None]] = []
            for segment in segments:
                text = segment.text.strip()
                if not text:
                    continue
                start_ms = chunk_start_ms + int(segment.start * 1000)
                end_ms = chunk_start_ms + int(segment.end * 1000)
                confidence = None
                avg_logprob = getattr(segment, "avg_logprob", None)
                if avg_logprob is not None:
                    confidence = min(1.0, max(0.0, math.exp(float(avg_logprob))))
                results.append((text, start_ms, end_ms, confidence))
            return results

        try:
            transcript_segments = await asyncio.to_thread(_run_transcription)
        except Exception:
            logger.exception("Failed to transcribe chunk for session %s", session_id)
            return

        if not transcript_segments:
            return

        engine = get_engine()
        pending_broadcasts: list[PendingSegmentBroadcast] = []
        with Session(engine) as db:
            session_row = session_service.get_by_id(db, session_id)
            speaker_labels = {
                speaker.id: speaker.label for speaker in session_row.speakers
            }
            default_speaker_id = sorted(
                session_row.speakers, key=lambda speaker: speaker.sort_order
            )[0].id

            for text, start_ms, end_ms, confidence in transcript_segments:
                segment_row = session_service.append_segment(
                    db,
                    session_id=session_id,
                    text=text,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    speaker_id=default_speaker_id,
                )
                pending_broadcasts.append(
                    PendingSegmentBroadcast(
                        segment_row=segment_row,
                        speaker_label=speaker_labels.get(segment_row.speaker_id, "Speaker 1"),
                        confidence=confidence,
                    )
                )

        for pending in pending_broadcasts:
            await transcript_stream_manager.broadcast_segment(
                session_id=session_id,
                segment=pending.segment_row,
                speaker_label=pending.speaker_label,
                is_final=True,
                confidence=pending.confidence,
            )


recording_coordinator = RecordingCoordinator()
