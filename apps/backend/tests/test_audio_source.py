import numpy as np

from app.modules.audio.errors import DeviceNotFoundError
from app.modules.audio.source import AudioDeviceInfo
from tests.mock_source import MockAudioSource


def test_mock_audio_source_lists_devices() -> None:
    source = MockAudioSource(
        [],
        devices=[AudioDeviceInfo(id=7, name="Test Mic", sample_rate=48000.0, is_default=True)],
    )

    devices = source.list_devices()

    assert len(devices) == 1
    assert devices[0].id == 7
    assert devices[0].name == "Test Mic"


def test_mock_audio_source_stream_lifecycle() -> None:
    samples = np.ones(800, dtype=np.float32)
    source = MockAudioSource([samples, samples])

    source.start_stream(device_id=0)
    assert source.is_streaming is True
    assert source.active_device_id == 0
    assert source.active_device_name == "Mock Mic"

    first = source.get_chunk(800)
    second = source.get_chunk(800)
    finished = source.get_chunk(800)

    assert first is not None and first.size == 800
    assert second is not None and second.size == 800
    assert finished is None

    source.stop_stream()
    assert source.is_streaming is False
    assert source.get_chunk(100) is None


def test_mock_audio_source_propagates_start_errors() -> None:
    source = MockAudioSource([], fail_on_start=DeviceNotFoundError("missing device"))

    try:
        source.start_stream(device_id=99)
    except DeviceNotFoundError as error:
        assert "missing device" in error.message
    else:
        raise AssertionError("Expected DeviceNotFoundError")
