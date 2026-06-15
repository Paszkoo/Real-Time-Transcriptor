import numpy as np


class AudioChunker:
    def __init__(
        self,
        *,
        chunk_duration_s: float,
        overlap_duration_s: float,
        sample_rate: int,
    ) -> None:
        if overlap_duration_s >= chunk_duration_s:
            raise ValueError("Overlap must be shorter than chunk duration.")

        self._chunk_samples = int(chunk_duration_s * sample_rate)
        self._overlap_samples = int(overlap_duration_s * sample_rate)
        self._buffer = np.array([], dtype=np.float32)
        self.chunks_emitted = 0

    def push(self, samples: np.ndarray) -> list[np.ndarray]:
        if samples.size == 0:
            return []

        flat = np.asarray(samples, dtype=np.float32).reshape(-1)
        if self._buffer.size == 0:
            self._buffer = flat
        else:
            self._buffer = np.concatenate((self._buffer, flat))

        emitted: list[np.ndarray] = []
        while self._buffer.size >= self._chunk_samples:
            chunk = self._buffer[: self._chunk_samples].copy()
            emitted.append(chunk)
            self.chunks_emitted += 1
            self._buffer = self._buffer[self._chunk_samples - self._overlap_samples :]

        return emitted

    def flush(self) -> np.ndarray | None:
        if self._buffer.size == 0:
            return None

        remaining = self._buffer.copy()
        self._buffer = np.array([], dtype=np.float32)
        self.chunks_emitted += 1
        return remaining
