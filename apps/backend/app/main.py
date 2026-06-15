import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.constants import BACKEND_VERSION
from app.error_handlers import audio_error_handler
from app.modules.audio.errors import AudioError
from app.routes.audio import router as audio_router
from app.routes.health import router as health_router


def create_app() -> FastAPI:
    if not logging.getLogger().handlers:
        logging.basicConfig(level=logging.INFO)

    app = FastAPI(title="Real-Time Transcriptor API", version=BACKEND_VERSION)
    app.add_exception_handler(AudioError, audio_error_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(audio_router)

    @app.get("/")
    def root() -> dict[str, str]:
        return {
            "service": "real-time-transcriptor-backend",
            "health": f"http://{settings.backend_host}:{settings.backend_port}/api/health",
        }

    return app


app = create_app()
