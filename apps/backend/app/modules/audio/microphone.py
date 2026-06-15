import logging

import numpy as np
import sounddevice as sd

from app.config import settings
from app.modules.audio.errors import (
    DeviceBusyError,
    DeviceNotFoundError,
    MicrophonePermissionError,
)
from app.modules.audio.source import AudioDeviceInfo, AudioSource

logger = logging.getLogger(__name__)

PERMISSION_ERROR_MARKERS = (
    "permission",
    "denied",
    "not allowed",
    "access denied",
    "unauthorized",
)


class MicrophoneAudioSource(AudioSource):
    def __init__(self, sample_rate: int | None = None) -> None:
        self._sample_rate = sample_rate or settings.audio_sample_rate
        self._stream: sd.InputStream | None = None
        self._device_id: int | None = None
        self._device_name: str | None = None

    def list_devices(self) -> list[AudioDeviceInfo]:
        devices = sd.query_devices()
        default_input = sd.default.device[0]
        result: list[AudioDeviceInfo] = []

        for index, device in enumerate(devices):
            if device["max_input_channels"] < 1:
                continue

            result.append(
                AudioDeviceInfo(
                    id=index,
                    name=str(device["name"]),
                    sample_rate=float(device["default_samplerate"]),
                    is_default=index == default_input,
                )
            )

        return result

    def start_stream(self, device_id: int | None = None) -> None:
        if self._stream is not None:
            return

        devices = self.list_devices()
        known_ids = {device.id for device in devices}
        if device_id is not None and device_id not in known_ids:
            raise DeviceNotFoundError(f"Audio input device {device_id} was not found.")

        selected = device_id
        if selected is None:
            default_device = next((device for device in devices if device.is_default), None)
            if default_device is None:
                raise DeviceNotFoundError("No audio input devices are available.")
            selected = default_device.id

        device_info = next(device for device in devices if device.id == selected)

        try:
            self._stream = sd.InputStream(
                samplerate=self._sample_rate,
                channels=1,
                dtype="float32",
                device=selected,
            )
            self._stream.start()
        except sd.PortAudioError as error:
            self._stream = None
            raise _map_portaudio_error(error, device_info.name) from error

        self._device_id = selected
        self._device_name = device_info.name
        logger.info(
            "Microphone stream started on device %s (%s) at %s Hz",
            selected,
            device_info.name,
            self._sample_rate,
        )

    def stop_stream(self) -> None:
        if self._stream is None:
            return

        self._stream.stop()
        self._stream.close()
        self._stream = None
        logger.info("Microphone stream stopped for device %s", self._device_id)
        self._device_id = None
        self._device_name = None

    def get_chunk(self, frames: int) -> np.ndarray | None:
        if self._stream is None:
            return None

        try:
            data, overflowed = self._stream.read(frames)
        except sd.PortAudioError as error:
            raise _map_portaudio_error(error, self._device_name or "microphone") from error

        if overflowed:
            logger.warning(
                "Microphone input overflow on device %s; audio samples may have been dropped.",
                self._device_name or self._device_id,
            )

        return np.asarray(data, dtype=np.float32).reshape(-1)

    @property
    def is_streaming(self) -> bool:
        return self._stream is not None and self._stream.active

    @property
    def active_device_id(self) -> int | None:
        return self._device_id

    @property
    def active_device_name(self) -> str | None:
        return self._device_name


def _map_portaudio_error(error: sd.PortAudioError, device_name: str) -> Exception:
    message = str(error).lower()

    if any(marker in message for marker in PERMISSION_ERROR_MARKERS):
        return MicrophonePermissionError(
            f"Microphone access was denied for '{device_name}'. "
            "Grant microphone permission to the backend process and try again."
        )

    if "busy" in message or "device unavailable" in message or error.errno == -9985:
        return DeviceBusyError(
            f"Microphone '{device_name}' is busy or unavailable. Close other apps using it."
        )

    if "invalid device" in message or "no such device" in message:
        return DeviceNotFoundError(f"Microphone '{device_name}' is no longer available.")

    return DeviceBusyError(f"Could not open microphone '{device_name}': {error}")
