import asyncio
import logging
from typing import Literal

import numpy as np
from rtt_shared.audio import CaptureStatusResponse

from app.config import settings
from app.modules.audio.chunker import AudioChunker
from app.modules.audio.errors import AudioError, CaptureAlreadyRunningError, CaptureNotRunningError
from app.modules.audio.file_source import FileAudioSource
from app.modules.audio.microphone import MicrophoneAudioSource
from app.modules.audio.source import AudioDeviceInfo, AudioSource
from app.modules.audio.vad import VadGate, create_vad_gate

logger = logging.getLogger(__name__)

FRAMES_PER_READ = 1600  # 100 ms at 16 kHz
IDLE_POLL_INTERVAL_S = 0.05
CaptureSourceType = Literal["microphone", "file"]


class CaptureService:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._source: AudioSource | None = None
        self._chunker: AudioChunker | None = None
        self._vad_gate: VadGate | None = None
        self._capture_task: asyncio.Task[None] | None = None
        self._queue: asyncio.Queue[np.ndarray] = asyncio.Queue(
            maxsize=settings.audio_chunk_queue_maxsize
        )
        self._running = False
        self._chunks_emitted = 0
        self._chunks_filtered = 0
        self._device_id: int | None = None
        self._device_name: str | None = None
        self._source_type: CaptureSourceType = "microphone"

    def list_devices(self) -> list[AudioDeviceInfo]:
        return MicrophoneAudioSource().list_devices()

    async def start(self, device_id: int) -> CaptureStatusResponse:
        return await self._start_source(MicrophoneAudioSource(), device_id=device_id)

    async def start_file(self, file_path: str) -> CaptureStatusResponse:
        return await self._start_source(FileAudioSource(file_path))

    async def _start_source(
        self,
        source: AudioSource,
        *,
        device_id: int | None = None,
    ) -> CaptureStatusResponse:
        async with self._lock:
            if self._running:
                raise CaptureAlreadyRunningError("Audio capture is already running.")

            self._source = source
            self._source_type = "file" if isinstance(source, FileAudioSource) else "microphone"
            self._chunker = AudioChunker(
                chunk_duration_s=settings.audio_chunk_duration_s,
                overlap_duration_s=settings.audio_chunk_overlap_s,
                sample_rate=settings.audio_sample_rate,
            )
            self._vad_gate = create_vad_gate()
            self._chunks_emitted = 0
            self._chunks_filtered = 0
            self._running = True

            try:
                await asyncio.to_thread(source.start_stream, device_id)
            except Exception:
                self._reset_state()
                raise

            self._device_id = source.active_device_id
            self._device_name = source.active_device_name
            self._capture_task = asyncio.create_task(self._capture_loop())
            return self._status(is_capturing=True)

    async def stop(self) -> CaptureStatusResponse:
        async with self._lock:
            if not self._running:
                raise CaptureNotRunningError("Audio capture is not running.")
            self._running = False

        if self._capture_task is not None:
            try:
                await self._capture_task
            except Exception:
                logger.exception("Capture loop ended with an error")

        final_status = self._status(is_capturing=False)
        self._reset_state()
        return final_status

    def get_status(self) -> CaptureStatusResponse:
        return self._status(is_capturing=self._running)

    async def pop_chunk(self, timeout: float | None = None) -> np.ndarray | None:
        if timeout is None:
            return await self._queue.get()

        try:
            return await asyncio.wait_for(self._queue.get(), timeout=timeout)
        except TimeoutError:
            return None

    async def _capture_loop(self) -> None:
        assert self._source is not None
        assert self._chunker is not None
        assert self._vad_gate is not None

        try:
            while self._running:
                try:
                    samples = await asyncio.to_thread(self._source.get_chunk, FRAMES_PER_READ)
                except AudioError as error:
                    logger.error("Capture input error: %s", error.message)
                    break
                except Exception:
                    logger.exception("Unexpected capture input failure")
                    break

                if samples is None:
                    if not self._source.is_streaming:
                        break
                    await asyncio.sleep(IDLE_POLL_INTERVAL_S)
                    continue

                if samples.size == 0:
                    continue

                for chunk in self._chunker.push(samples):
                    if self._chunk_passes_vad(chunk):
                        await self._emit_chunk(chunk)
                    else:
                        self._chunks_filtered += 1
        finally:
            if self._source.is_streaming:
                await asyncio.to_thread(self._source.stop_stream)

            self._running = False
            await self._flush_remaining_buffer()
            self._capture_task = None

    async def _flush_remaining_buffer(self) -> None:
        if self._chunker is None:
            return

        final_chunk = self._chunker.flush()
        if final_chunk is None:
            return

        if self._chunk_passes_vad(final_chunk):
            await self._emit_chunk(final_chunk)
        else:
            self._chunks_filtered += 1

    def _chunk_passes_vad(self, chunk: np.ndarray) -> bool:
        if not settings.vad_enabled or self._vad_gate is None:
            return True

        return self._vad_gate.filter(chunk).size > 0

    async def _emit_chunk(self, chunk: np.ndarray) -> None:
        self._chunks_emitted += 1
        duration_s = chunk.size / settings.audio_sample_rate
        peak = float(np.max(np.abs(chunk))) if chunk.size else 0.0
        logger.info(
            "Audio chunk #%s: %s samples (%.2fs), peak=%.4f",
            self._chunks_emitted,
            chunk.size,
            duration_s,
            peak,
        )

        if self._queue.full():
            try:
                self._queue.get_nowait()
                logger.warning("Audio chunk queue full; dropping oldest chunk")
            except asyncio.QueueEmpty:
                pass

        await self._queue.put(chunk)

    def _status(self, *, is_capturing: bool) -> CaptureStatusResponse:
        return CaptureStatusResponse(
            is_capturing=is_capturing,
            device_id=self._device_id,
            device_name=self._device_name,
            source_type=self._source_type,
            chunks_emitted=self._chunks_emitted,
            chunks_filtered=self._chunks_filtered,
            queue_size=self._queue.qsize(),
        )

    def _reset_state(self) -> None:
        self._capture_task = None
        self._source = None
        self._chunker = None
        self._vad_gate = None
        self._device_id = None
        self._device_name = None
        self._source_type = "microphone"


capture_service = CaptureService()
