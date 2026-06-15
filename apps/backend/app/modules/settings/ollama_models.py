import httpx
from rtt_shared.settings import OllamaModelResponse, OllamaModelsResponse

from app.config import settings
from app.modules.llm.client import is_ollama_model_available
from app.modules.settings.runtime import runtime_settings


async def fetch_ollama_models() -> OllamaModelsResponse:
    try:
        async with httpx.AsyncClient(
            base_url=settings.ollama_host.rstrip("/"),
            timeout=httpx.Timeout(5.0),
        ) as client:
            response = await client.get("/api/tags")
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError:
        return OllamaModelsResponse(
            available=False,
            models=[],
            active_model=runtime_settings.ollama_model,
        )

    models = [
        OllamaModelResponse(
            name=str(entry.get("name", "")),
            size=entry.get("size") if isinstance(entry.get("size"), int) else None,
        )
        for entry in payload.get("models", [])
        if entry.get("name")
    ]
    return OllamaModelsResponse(
        available=True,
        models=models,
        active_model=runtime_settings.ollama_model,
    )


def is_active_ollama_model_available(tags_payload: dict) -> bool:
    return is_ollama_model_available(runtime_settings.ollama_model, tags_payload)
