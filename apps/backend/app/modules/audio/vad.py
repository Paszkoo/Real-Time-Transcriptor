import logging
from typing import Protocol

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

WINDOW_SIZE_16K = 512


class VadGate(Protocol):
    def filter(self, samples: np.ndarray) -> np.ndarray: ...


class PassthroughVadGate:
    def filter(self, samples: np.ndarray) -> np.ndarray:
        return np.asarray(samples, dtype=np.float32).reshape(-1)


class SileroVadGate:
    def __init__(self, threshold: float, sample_rate: int) -> None:
        import torch
        from silero_vad import load_silero_vad

        self._torch = torch
        self._threshold = threshold
        self._model = load_silero_vad()
        self._sample_rate = sample_rate

    def filter(self, samples: np.ndarray) -> np.ndarray:
        flat = np.asarray(samples, dtype=np.float32).reshape(-1)
        if flat.size == 0:
            return flat

        kept: list[np.ndarray] = []
        for start in range(0, flat.size, WINDOW_SIZE_16K):
            window = flat[start : start + WINDOW_SIZE_16K]
            if window.size < WINDOW_SIZE_16K:
                if window.size < WINDOW_SIZE_16K // 2:
                    break
                window = np.pad(window, (0, WINDOW_SIZE_16K - window.size))

            tensor = self._torch.from_numpy(window)
            speech_prob = self._model(tensor, self._sample_rate).item()
            if speech_prob >= self._threshold:
                original = flat[start : start + WINDOW_SIZE_16K]
                kept.append(original[: min(WINDOW_SIZE_16K, flat.size - start)])

        if not kept:
            return np.array([], dtype=np.float32)
        return np.concatenate(kept)


def create_vad_gate(
    *,
    enabled: bool | None = None,
    threshold: float | None = None,
    sample_rate: int | None = None,
) -> VadGate:
    vad_enabled = settings.vad_enabled if enabled is None else enabled
    vad_threshold = settings.vad_threshold if threshold is None else threshold
    vad_sample_rate = settings.audio_sample_rate if sample_rate is None else sample_rate

    if not vad_enabled:
        logger.info("VAD is disabled via configuration.")
        return PassthroughVadGate()

    try:
        gate = SileroVadGate(threshold=vad_threshold, sample_rate=vad_sample_rate)
        logger.info("Silero VAD enabled with threshold %.2f", vad_threshold)
        return gate
    except ImportError:
        logger.warning(
            "Silero VAD dependencies are not installed. Install backend with [audio] extras "
            "or disable VAD via VAD_ENABLED=false."
        )
        return PassthroughVadGate()
