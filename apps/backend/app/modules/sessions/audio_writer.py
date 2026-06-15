import wave

import numpy as np

from app.config import resolve_session_audio_dir


class SessionAudioWriter:
    def __init__(self, *, sample_rate: int) -> None:
        self._sample_rate = sample_rate
        self._chunks: list[np.ndarray] = []

    def append(self, chunk: np.ndarray) -> None:
        if chunk.size == 0:
            return
        self._chunks.append(chunk.astype(np.float32, copy=False))

    @property
    def duration_ms(self) -> int:
        if not self._chunks:
            return 0
        total_samples = sum(chunk.size for chunk in self._chunks)
        return int(total_samples / self._sample_rate * 1000)

    def save(self, session_id: str) -> str | None:
        if not self._chunks:
            return None

        audio_dir = resolve_session_audio_dir()
        audio_dir.mkdir(parents=True, exist_ok=True)
        output_path = audio_dir / f"{session_id}.wav"

        audio = np.concatenate(self._chunks)
        audio = np.clip(audio, -1.0, 1.0)
        pcm = (audio * 32767).astype(np.int16)

        with wave.open(str(output_path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self._sample_rate)
            wav_file.writeframes(pcm.tobytes())

        return str(output_path)
