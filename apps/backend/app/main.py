import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.constants import BACKEND_VERSION
from app.db.engine import run_migrations
from app.error_handlers import domain_error_handler
from app.modules.audio.errors import AudioError
from app.modules.llm.errors import LlmError
from app.modules.sessions.errors import SessionError
from app.modules.settings.store import load_runtime_settings
from app.modules.transcription.errors import TranscriptionError
from app.routes.audio import router as audio_router
from app.routes.health import router as health_router
from app.routes.llm import router as llm_router
from app.routes.llm import ws_router as llm_ws_router
from app.routes.sessions import router as sessions_router
from app.routes.settings import router as settings_router
from app.routes.transcript import ws_router as transcript_ws_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_migrations()
    load_runtime_settings()
    yield


def create_app() -> FastAPI:
    if not logging.getLogger().handlers:
        logging.basicConfig(level=logging.INFO)

    app = FastAPI(title="Real-Time Transcriptor API", version=BACKEND_VERSION, lifespan=lifespan)
    app.add_exception_handler(AudioError, domain_error_handler)
    app.add_exception_handler(TranscriptionError, domain_error_handler)
    app.add_exception_handler(SessionError, domain_error_handler)
    app.add_exception_handler(LlmError, domain_error_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(audio_router)
    app.include_router(sessions_router)
    app.include_router(settings_router)
    app.include_router(llm_router)
    app.include_router(llm_ws_router)
    app.include_router(transcript_ws_router)

    @app.get("/")
    def root() -> dict[str, str]:
        return {
            "service": "real-time-transcriptor-backend",
            "health": f"http://{settings.backend_host}:{settings.backend_port}/api/health",
        }

    return app


app = create_app()
