import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.modules.sessions.errors import SessionError
from app.modules.sessions.transcript_stream import transcript_stream_manager

logger = logging.getLogger(__name__)

ws_router = APIRouter(tags=["transcript"])


@ws_router.websocket("/ws/transcript/{session_id}")
async def transcript_stream(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()

    try:
        queue = await transcript_stream_manager.subscribe(session_id)
    except SessionError as exc:
        await websocket.send_json({"type": "error", "code": exc.code, "message": exc.message})
        await websocket.close()
        return
    except Exception:
        await websocket.send_json(
            {
                "type": "error",
                "code": "session_error",
                "message": "Could not subscribe to transcript stream.",
            }
        )
        await websocket.close()
        return

    try:
        while True:
            event = await queue.get()
            await websocket.send_text(json.dumps(event))
            if event.get("type") in {"closed", "error"}:
                break
    except WebSocketDisconnect:
        logger.debug("Transcript WebSocket disconnected for session %s", session_id)
    finally:
        await transcript_stream_manager.unsubscribe(session_id, queue)
