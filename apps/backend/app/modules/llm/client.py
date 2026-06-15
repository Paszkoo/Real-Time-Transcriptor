from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.config import settings
from app.modules.llm.errors import (
    OLLAMA_MODEL_MISSING_MESSAGE,
    OLLAMA_UNAVAILABLE_MESSAGE,
    OllamaUnavailableError,
)
from app.modules.settings.runtime import runtime_settings

logger = logging.getLogger(__name__)


def is_ollama_model_available(model_name: str, tags: dict) -> bool:
    available = {model.get("name", "") for model in tags.get("models", [])}
    return model_name in available or f"{model_name}:latest" in available


class OllamaClient:
    """HTTP client for the local Ollama API with streaming support."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.ollama_host.rstrip("/"),
            timeout=httpx.Timeout(settings.ollama_request_timeout_s),
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def ensure_available(self) -> None:
        try:
            response = await self._client.get("/api/tags", timeout=5.0)
            response.raise_for_status()
            tags = response.json()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise OllamaUnavailableError() from exc
        except httpx.HTTPError as exc:
            raise OllamaUnavailableError(f"{OLLAMA_UNAVAILABLE_MESSAGE} Details: {exc}") from exc

        if not is_ollama_model_available(runtime_settings.ollama_model, tags):
            raise OllamaUnavailableError(OLLAMA_MODEL_MISSING_MESSAGE)

    async def stream_chat(
        self,
        *,
        prompt: str,
        temperature: float,
    ) -> AsyncIterator[str]:
        payload = {
            "model": runtime_settings.ollama_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
            "options": {"temperature": temperature},
        }

        try:
            async with self._client.stream("POST", "/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue

                    data = json.loads(line)
                    message = data.get("message", {})
                    # Qwen3 thinking tokens must not be forwarded to the UI.
                    token = message.get("content", "")
                    if token:
                        yield token

                    if data.get("done"):
                        break
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise OllamaUnavailableError() from exc
        except httpx.HTTPStatusError as exc:
            raise OllamaUnavailableError(
                f"{OLLAMA_UNAVAILABLE_MESSAGE} Details: {exc.response.text}"
            ) from exc
        except httpx.HTTPError as exc:
            logger.exception("Ollama request failed")
            raise OllamaUnavailableError(f"{OLLAMA_UNAVAILABLE_MESSAGE} Details: {exc}") from exc


ollama_client = OllamaClient()
