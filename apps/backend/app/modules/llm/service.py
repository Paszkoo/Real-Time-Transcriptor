from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.engine import get_engine
from app.db.models import JobRow, SessionArtifactRow, SessionRow
from app.modules.llm.client import ollama_client
from app.modules.llm.errors import (
    LlmError,
    LlmJobAlreadyRunningError,
    LlmJobNotFoundError,
    LlmTranscriptTooLongError,
    SessionNotClosedError,
)
from app.modules.llm.prompts import LlmTask, SummaryFormat, artifact_type_for_task, resolve_prompt
from app.modules.sessions.errors import SessionNotFoundError
from app.modules.sessions.service import session_service

logger = logging.getLogger(__name__)

INTERRUPTED_JOB_MESSAGE = "Processing was interrupted. Please start again."


def _format_job_error(code: str, message: str) -> str:
    return f"[{code}] {message}"


def _parse_job_error(error_message: str | None) -> tuple[str, str]:
    if error_message and error_message.startswith("[") and "] " in error_message:
        code, _, message = error_message.partition("] ")
        return code.removeprefix("["), message
    return "llm_error", error_message or "LLM job failed."


def _done_event(content: str) -> dict[str, Any]:
    return {"type": "done", "content": content}


def _error_event(code: str, message: str) -> dict[str, Any]:
    return {"type": "error", "code": code, "message": message}


async def _enqueue_event(queue: asyncio.Queue[dict[str, Any]], event: dict[str, Any]) -> None:
    await queue.put(event)


@dataclass
class LlmJobState:
    job_id: str
    session_id: str
    task: LlmTask
    artifact_type: str
    status: Literal["pending", "running", "done", "failed"] = "pending"
    content: str = ""
    error_code: str | None = None
    error_message: str | None = None
    subscribers: list[asyncio.Queue[dict[str, Any]]] = field(default_factory=list)
    task_handle: asyncio.Task[None] | None = None


class LlmJobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, LlmJobState] = {}
        self._lock = asyncio.Lock()

    async def start_job(
        self,
        *,
        session_id: str,
        task: LlmTask,
        summary_format: SummaryFormat = "bullets",
    ) -> str:
        engine = get_engine()
        with Session(engine) as db:
            session_row = session_service.get_by_id(db, session_id)
            if session_row.status != "closed":
                raise SessionNotClosedError("LLM processing is only available for closed sessions.")
            if not session_row.segments:
                raise LlmError("Session has no transcript segments to process.")

            transcript = _build_transcript(session_row)
            if len(transcript) > settings.llm_max_transcript_chars:
                raise LlmTranscriptTooLongError(
                    f"Transcript exceeds the {settings.llm_max_transcript_chars} character limit "
                    "for local LLM processing."
                )

            artifact_type = artifact_type_for_task(task, summary_format=summary_format)

        async with self._lock:
            for existing in self._jobs.values():
                if (
                    existing.session_id == session_id
                    and existing.artifact_type == artifact_type
                    and existing.status in ("pending", "running")
                ):
                    raise LlmJobAlreadyRunningError(
                        f"A {artifact_type} job is already running for this session."
                    )

            job_id = str(uuid.uuid4())
            with Session(engine) as db:
                db.add(
                    JobRow(
                        id=job_id,
                        session_id=session_id,
                        segment_id=None,
                        job_type=f"llm_{artifact_type}",
                        status="pending",
                    )
                )
                db.commit()

            state = LlmJobState(
                job_id=job_id,
                session_id=session_id,
                task=task,
                artifact_type=artifact_type,
            )
            self._jobs[job_id] = state

        state.task_handle = asyncio.create_task(
            self._run_job(state, transcript=transcript, summary_format=summary_format)
        )
        return job_id

    async def subscribe(self, job_id: str) -> asyncio.Queue[dict[str, Any]]:
        async with self._lock:
            state = self._jobs.get(job_id)
            if state is None:
                persisted = _load_persisted_job(job_id)
                if persisted is None:
                    raise LlmJobNotFoundError(f"LLM job '{job_id}' was not found.")
                queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
                if persisted["status"] == "done":
                    await _enqueue_event(queue, _done_event(persisted["content"] or ""))
                elif persisted["status"] in ("pending", "running"):
                    _mark_job_interrupted(job_id)
                    await _enqueue_event(
                        queue,
                        _error_event("llm_job_not_found", INTERRUPTED_JOB_MESSAGE),
                    )
                else:
                    await _enqueue_event(
                        queue,
                        _error_event(
                            persisted["error_code"] or "llm_error",
                            persisted["error_message"] or "LLM job failed.",
                        ),
                    )
                return queue

            queue = asyncio.Queue()
            state.subscribers.append(queue)

            if state.status == "done":
                await _enqueue_event(queue, _done_event(state.content))
            elif state.status == "failed":
                await _enqueue_event(
                    queue,
                    _error_event(
                        state.error_code or "llm_error",
                        state.error_message or "LLM job failed.",
                    ),
                )
            elif state.content:
                await _enqueue_event(queue, {"type": "token", "content": state.content})

            return queue

    async def unsubscribe(self, job_id: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        async with self._lock:
            state = self._jobs.get(job_id)
            if state is None:
                return
            if queue in state.subscribers:
                state.subscribers.remove(queue)
            self._maybe_remove_job(state)

    async def _run_job(
        self,
        state: LlmJobState,
        *,
        transcript: str,
        summary_format: SummaryFormat,
    ) -> None:
        state.status = "running"
        _update_job_status(state.job_id, status="running")

        try:
            await ollama_client.ensure_available()
            prompt, temperature = resolve_prompt(
                state.task,
                transcript,
                summary_format=summary_format,
            )

            async for token in ollama_client.stream_chat(prompt=prompt, temperature=temperature):
                state.content += token
                await self._broadcast(state, {"type": "token", "content": token})

            if not state.content.strip():
                raise LlmError("The model returned an empty response.")

            _save_artifact(
                session_id=state.session_id,
                artifact_type=state.artifact_type,
                content=state.content,
            )
            _update_job_status(state.job_id, status="done")
            state.status = "done"
            await self._broadcast(state, {"type": "done", "content": state.content})
        except LlmError as exc:
            await self._fail_job(state, code=exc.code, message=exc.message)
        except Exception as exc:
            logger.exception("Unexpected LLM job failure for job %s", state.job_id)
            await self._fail_job(state, code="llm_error", message=str(exc))
        finally:
            async with self._lock:
                self._maybe_remove_job(state)

    async def _fail_job(self, state: LlmJobState, *, code: str, message: str) -> None:
        state.status = "failed"
        state.error_code = code
        state.error_message = message
        _update_job_status(
            state.job_id,
            status="failed",
            error_message=_format_job_error(code, message),
        )
        await self._broadcast(
            state,
            {"type": "error", "code": code, "message": message},
        )

    async def _broadcast(self, state: LlmJobState, event: dict[str, Any]) -> None:
        for queue in list(state.subscribers):
            await queue.put(event)

    def _maybe_remove_job(self, state: LlmJobState) -> None:
        if state.status in ("done", "failed") and not state.subscribers:
            self._jobs.pop(state.job_id, None)


def _build_transcript(session_row: SessionRow) -> str:
    speakers = {speaker.id: speaker.label for speaker in session_row.speakers}
    segments = sorted(session_row.segments, key=lambda segment: segment.sequence)
    lines: list[str] = []
    for segment in segments:
        label = speakers.get(segment.speaker_id, "Speaker")
        lines.append(f"{label}: {segment.text}")
    return "\n".join(lines)


def _update_job_status(
    job_id: str,
    *,
    status: str,
    error_message: str | None = None,
) -> None:
    engine = get_engine()
    with Session(engine) as db:
        job_row = db.get(JobRow, job_id)
        if job_row is None:
            return
        job_row.status = status
        if error_message is not None:
            job_row.error_message = error_message
        db.commit()


def _mark_job_interrupted(job_id: str) -> None:
    _update_job_status(
        job_id,
        status="failed",
        error_message=_format_job_error("llm_job_not_found", INTERRUPTED_JOB_MESSAGE),
    )


def _save_artifact(*, session_id: str, artifact_type: str, content: str) -> None:
    engine = get_engine()
    with Session(engine) as db:
        existing = db.scalar(
            select(SessionArtifactRow).where(
                SessionArtifactRow.session_id == session_id,
                SessionArtifactRow.artifact_type == artifact_type,
            )
        )
        now = datetime.now(UTC)
        if existing is None:
            db.add(
                SessionArtifactRow(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    artifact_type=artifact_type,
                    content=content,
                    created_at=now,
                    updated_at=now,
                )
            )
        else:
            existing.content = content
            existing.updated_at = now
        db.commit()


def _load_persisted_job(job_id: str) -> dict[str, str | None] | None:
    engine = get_engine()
    with Session(engine) as db:
        job_row = db.get(JobRow, job_id)
        if job_row is None:
            return None

        content = ""
        if job_row.status == "done":
            artifact = db.scalar(
                select(SessionArtifactRow).where(
                    SessionArtifactRow.session_id == job_row.session_id,
                    SessionArtifactRow.artifact_type == job_row.job_type.removeprefix("llm_"),
                )
            )
            if artifact is not None:
                content = artifact.content

        parsed_error = _parse_job_error(job_row.error_message)
        error_code = parsed_error[0] if job_row.status == "failed" else None
        error_message = parsed_error[1]

        return {
            "status": job_row.status,
            "content": content,
            "error_code": error_code,
            "error_message": error_message,
        }


class LlmService:
    def list_artifacts(self, db: Session, session_id: str) -> list[SessionArtifactRow]:
        session_row = db.get(SessionRow, session_id)
        if session_row is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")

        return list(
            db.scalars(
                select(SessionArtifactRow)
                .where(SessionArtifactRow.session_id == session_id)
                .order_by(SessionArtifactRow.updated_at.desc())
            ).all()
        )


llm_job_manager = LlmJobManager()
llm_service = LlmService()
