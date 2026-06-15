import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from rtt_shared.sessions import ProcessSessionRequest, ProcessSessionResponse

from app.modules.llm import llm_job_manager
from app.modules.llm.errors import LlmError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["llm"])


@router.post("/sessions/{session_id}/process", response_model=ProcessSessionResponse)
async def process_session(
    session_id: str,
    body: ProcessSessionRequest,
) -> ProcessSessionResponse:
    job_id = await llm_job_manager.start_job(
        session_id=session_id,
        task=body.task,
        summary_format=body.format,
    )
    return ProcessSessionResponse(job_id=job_id)


ws_router = APIRouter(tags=["llm"])


@ws_router.websocket("/ws/llm/{job_id}")
async def llm_job_stream(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()

    try:
        queue = await llm_job_manager.subscribe(job_id)
    except LlmError as exc:
        await websocket.send_json({"type": "error", "code": exc.code, "message": exc.message})
        await websocket.close()
        return
    except Exception:
        await websocket.send_json(
            {"type": "error", "code": "llm_error", "message": "Could not subscribe to LLM job."}
        )
        await websocket.close()
        return

    try:
        while True:
            event = await queue.get()
            await websocket.send_text(json.dumps(event))
            if event.get("type") in {"done", "error"}:
                break
    except WebSocketDisconnect:
        logger.debug("LLM WebSocket disconnected for job %s", job_id)
    finally:
        await llm_job_manager.unsubscribe(job_id, queue)
