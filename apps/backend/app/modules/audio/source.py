from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class AudioDeviceInfo:
    id: int
    name: str
    sample_rate: float
    is_default: bool


class AudioSource(ABC):
    @abstractmethod
    def list_devices(self) -> list[AudioDeviceInfo]:
        raise NotImplementedError

    @abstractmethod
    def start_stream(self, device_id: int | None = None) -> None:
        raise NotImplementedError

    @abstractmethod
    def stop_stream(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_chunk(self, frames: int) -> np.ndarray | None:
        raise NotImplementedError

    @property
    @abstractmethod
    def is_streaming(self) -> bool:
        raise NotImplementedError

    @property
    @abstractmethod
    def active_device_id(self) -> int | None:
        raise NotImplementedError

    @property
    @abstractmethod
    def active_device_name(self) -> str | None:
        raise NotImplementedError
