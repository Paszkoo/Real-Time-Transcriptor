import logging
import shutil
import subprocess
from pathlib import Path

import numpy as np

from app.config import settings
from app.modules.audio.errors import (
    AudioDecodeError,
    AudioFileNotFoundError,
    FfmpegNotFoundError,
    UnsupportedAudioFormatError,
)
from app.modules.audio.path_validation import resolve_allowed_audio_file
from app.modules.audio.source import AudioDeviceInfo, AudioSource

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".mp3", ".mp4", ".m4a", ".wav", ".mkv", ".webm"}


class FileAudioSource(AudioSource):
    def __init__(self, file_path: str | Path, sample_rate: int | None = None) -> None:
        self._file_path = resolve_allowed_audio_file(file_path)
        self._sample_rate = sample_rate or settings.audio_sample_rate
        self._process: subprocess.Popen[bytes] | None = None
        self._device_name = self._file_path.name

    def list_devices(self) -> list[AudioDeviceInfo]:
        return []

    def start_stream(self, device_id: int | None = None) -> None:
        if self._process is not None:
            return

        self._validate_file()
        ffmpeg = _resolve_ffmpeg()
        command = [
            ffmpeg,
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(self._file_path),
            "-f",
            "f32le",
            "-acodec",
            "pcm_f32le",
            "-ac",
            "1",
            "-ar",
            str(self._sample_rate),
            "-",
        ]

        try:
            self._process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
        except OSError as error:
            raise FfmpegNotFoundError(
                "Could not start ffmpeg. Install ffmpeg and ensure it is on PATH."
            ) from error

        self._verify_ffmpeg_process()
        logger.info("File audio stream started for %s at %s Hz", self._file_path, self._sample_rate)

    def stop_stream(self) -> None:
        if self._process is None:
            return

        if self._process.stdout is not None:
            self._process.stdout.close()
        if self._process.stderr is not None:
            self._process.stderr.close()

        if self._process.poll() is None:
            self._process.terminate()
            try:
                self._process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait(timeout=3)

        self._process = None
        logger.info("File audio stream stopped for %s", self._file_path)

    def get_chunk(self, frames: int) -> np.ndarray | None:
        if self._process is None or self._process.stdout is None:
            return None

        byte_count = frames * np.dtype(np.float32).itemsize
        raw = self._process.stdout.read(byte_count)
        if not raw:
            stderr = ""
            if self._process.stderr is not None:
                stderr = self._process.stderr.read().decode("utf-8", errors="replace").strip()
            if self._process.poll() not in (None, 0) and stderr:
                logger.error("ffmpeg failed for %s: %s", self._file_path, stderr)
            return None

        samples = np.frombuffer(raw, dtype=np.float32)
        if samples.size < frames:
            return samples.copy()
        return samples.reshape(-1)

    @property
    def is_streaming(self) -> bool:
        return self._process is not None and self._process.poll() is None

    @property
    def active_device_id(self) -> int | None:
        return None

    @property
    def active_device_name(self) -> str | None:
        return self._device_name

    @property
    def file_path(self) -> Path:
        return self._file_path

    def _validate_file(self) -> None:
        if not self._file_path.exists():
            raise AudioFileNotFoundError(f"Audio file was not found: {self._file_path}")

        if not self._file_path.is_file():
            raise AudioFileNotFoundError(f"Path is not a file: {self._file_path}")

        if self._file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            supported = ", ".join(sorted(SUPPORTED_EXTENSIONS))
            raise UnsupportedAudioFormatError(
                f"Unsupported audio format '{self._file_path.suffix}'. Supported: {supported}"
            )

    def _verify_ffmpeg_process(self) -> None:
        if self._process is None or self._process.poll() is None:
            return

        stderr = ""
        if self._process.stderr is not None:
            stderr = self._process.stderr.read().decode("utf-8", errors="replace").strip()

        message = stderr or "ffmpeg exited before producing audio output."
        raise AudioDecodeError(message)


def _resolve_ffmpeg() -> str:
    ffmpeg_path = settings.ffmpeg_path
    if Path(ffmpeg_path).is_file():
        return str(Path(ffmpeg_path).resolve())

    resolved = shutil.which(ffmpeg_path)
    if resolved is None:
        raise FfmpegNotFoundError(
            "ffmpeg was not found. Install ffmpeg or set FFMPEG_PATH in the environment."
        )
    return resolved
