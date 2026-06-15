from fastapi import APIRouter
from rtt_shared.health import HealthResponse

from app.constants import BACKEND_VERSION

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", backend_version=BACKEND_VERSION)
