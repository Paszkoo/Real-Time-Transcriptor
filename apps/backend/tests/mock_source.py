import numpy as np

from app.modules.audio.source import AudioDeviceInfo, AudioSource


class MockAudioSource(AudioSource):
    def __init__(
        self,
        chunks: list[np.ndarray],
        *,
        devices: list[AudioDeviceInfo] | None = None,
        fail_on_start: Exception | None = None,
    ) -> None:
        self._chunks = [np.asarray(chunk, dtype=np.float32).reshape(-1) for chunk in chunks]
        self._devices = devices or [
            AudioDeviceInfo(id=0, name="Mock Mic", sample_rate=16000.0, is_default=True)
        ]
        self._fail_on_start = fail_on_start
        self._streaming = False
        self._device_id: int | None = None
        self._device_name: str | None = None
        self._chunk_index = 0

    def list_devices(self) -> list[AudioDeviceInfo]:
        return self._devices

    def start_stream(self, device_id: int | None = None) -> None:
        if self._fail_on_start is not None:
            raise self._fail_on_start

        self._streaming = True
        self._device_id = 0 if device_id is None else device_id
        self._device_name = next(
            (device.name for device in self._devices if device.id == self._device_id),
            "Mock Mic",
        )
        self._chunk_index = 0

    def stop_stream(self) -> None:
        self._streaming = False
        self._device_id = None
        self._device_name = None

    def get_chunk(self, frames: int) -> np.ndarray | None:
        if not self._streaming or self._chunk_index >= len(self._chunks):
            self._streaming = False
            return None

        chunk = self._chunks[self._chunk_index]
        self._chunk_index += 1
        return chunk[:frames]

    @property
    def is_streaming(self) -> bool:
        return self._streaming

    @property
    def active_device_id(self) -> int | None:
        return self._device_id

    @property
    def active_device_name(self) -> str | None:
        return self._device_name
