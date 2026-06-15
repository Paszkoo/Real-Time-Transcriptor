from __future__ import annotations

import asyncio
import logging
import threading
from typing import TYPE_CHECKING

from app.config import resolve_whisper_model_dir
from app.modules.settings.runtime import runtime_settings
from app.modules.transcription.errors import (
    WhisperModelLoadError,
    WhisperModelNotAvailableError,
)

if TYPE_CHECKING:
    from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)


def _resolve_device() -> str:
    device = runtime_settings.device.lower()
    if device == "mps":
        logger.warning("faster-whisper does not support MPS; falling back to CPU.")
        return "cpu"
    if device in ("cpu", "cuda"):
        return device
    logger.warning("Unknown DEVICE=%s; falling back to CPU.", runtime_settings.device)
    return "cpu"


def _resolve_compute_type(device: str) -> str:
    return "int8" if device == "cuda" else "int8_float32"


class WhisperService:
    """Lazy-loading wrapper around faster-whisper."""

    def __init__(self) -> None:
        self._model: WhisperModel | None = None
        self._load_lock = threading.Lock()
        self._pending_reload = False

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def ensure_loaded(self) -> None:
        self._load_model()

    async def ensure_loaded_async(self) -> None:
        await asyncio.to_thread(self._load_model)

    def unload(self) -> None:
        with self._load_lock:
            self._model = None
            logger.info("Whisper model unloaded; will reload on next session.")

    def request_reload(self, *, defer: bool) -> None:
        if defer:
            self._pending_reload = True
            logger.info("Whisper reload deferred until capture stops.")
            return
        self._pending_reload = False
        self.unload()

    def apply_pending_reload(self) -> None:
        if not self._pending_reload:
            return
        self._pending_reload = False
        self.unload()

    def get_model(self) -> WhisperModel:
        self._load_model()
        return self._model  # type: ignore[return-value]

    def _load_model(self) -> None:
        if self._model is not None:
            return

        with self._load_lock:
            if self._model is not None:
                return

            try:
                from faster_whisper import WhisperModel
            except ImportError as exc:
                raise WhisperModelNotAvailableError(
                    'faster-whisper is not installed. Run `pip install -e ".[models]"`.'
                ) from exc

            device = _resolve_device()
            compute_type = _resolve_compute_type(device)

            model_dir = str(resolve_whisper_model_dir())

            logger.info(
                "Loading Whisper model '%s' (device=%s, compute_type=%s, dir=%s)",
                runtime_settings.whisper_model_name,
                device,
                compute_type,
                model_dir,
            )

            try:
                self._model = WhisperModel(
                    runtime_settings.whisper_model_name,
                    device=device,
                    compute_type=compute_type,
                    download_root=model_dir,
                )
            except Exception as exc:
                raise WhisperModelLoadError(
                    f"Failed to load Whisper model '{runtime_settings.whisper_model_name}': {exc}"
                ) from exc

            logger.info("Whisper model '%s' ready.", runtime_settings.whisper_model_name)


whisper_service = WhisperService()
