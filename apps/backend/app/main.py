from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.constants import BACKEND_VERSION
from app.routes.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="Real-Time Transcriptor API", version=BACKEND_VERSION)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)

    @app.get("/")
    def root() -> dict[str, str]:
        return {
            "service": "real-time-transcriptor-backend",
            "health": f"http://{settings.backend_host}:{settings.backend_port}/api/health",
        }

    return app


app = create_app()
