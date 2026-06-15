import asyncio

import numpy as np
import pytest

from app.modules.audio.capture import CaptureService
from app.modules.audio.errors import CaptureAlreadyRunningError, CaptureNotRunningError
from app.modules.audio.vad import PassthroughVadGate
from tests.mock_source import MockAudioSource


@pytest.fixture
def capture_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.modules.audio.capture.settings.audio_chunk_duration_s", 0.2)
    monkeypatch.setattr("app.modules.audio.capture.settings.audio_chunk_overlap_s", 0.05)
    monkeypatch.setattr("app.modules.audio.capture.settings.audio_sample_rate", 16000)
    monkeypatch.setattr("app.modules.audio.capture.settings.vad_enabled", False)
    monkeypatch.setattr(
        "app.modules.audio.capture.create_vad_gate",
        lambda: PassthroughVadGate(),
    )


@pytest.mark.asyncio
async def test_capture_service_emits_chunks_to_queue(capture_settings: None) -> None:
    service = CaptureService()
    chunk = np.ones(6400, dtype=np.float32)
    source = MockAudioSource([chunk, chunk, chunk])

    await service._start_source(source, device_id=0)
    assert service.get_status().is_capturing is True

    queued = await service.pop_chunk(timeout=2.0)
    assert queued is not None
    assert queued.size == 3200

    final_status = await service.stop()
    assert final_status.is_capturing is False
    assert final_status.chunks_emitted >= 1


@pytest.mark.asyncio
async def test_capture_service_rejects_parallel_sessions(capture_settings: None) -> None:
    service = CaptureService()
    source = MockAudioSource([np.ones(1600, dtype=np.float32)])

    await service._start_source(source, device_id=0)

    with pytest.raises(CaptureAlreadyRunningError):
        await service.start(device_id=0)

    await service.stop()


@pytest.mark.asyncio
async def test_capture_service_requires_active_session_for_stop(capture_settings: None) -> None:
    service = CaptureService()

    with pytest.raises(CaptureNotRunningError):
        await service.stop()


@pytest.mark.asyncio
async def test_capture_service_auto_ends_when_source_finishes(capture_settings: None) -> None:
    service = CaptureService()
    source = MockAudioSource([np.ones(6400, dtype=np.float32)])

    await service._start_source(source, device_id=0)
    assert service.get_status().is_capturing is True

    for _ in range(50):
        if not service.get_status().is_capturing:
            break
        await asyncio.sleep(0.05)

    status = service.get_status()
    assert status.is_capturing is False
    assert status.chunks_emitted >= 1
