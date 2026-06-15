import builtins
import sys
import types
from unittest.mock import MagicMock

import pytest

from app.config import resolve_whisper_model_dir
from app.modules.transcription.errors import WhisperModelLoadError, WhisperModelNotAvailableError
from app.modules.transcription.whisper_service import (
    WhisperService,
    _resolve_compute_type,
    _resolve_device,
)


@pytest.fixture
def whisper_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.config.settings.whisper_model_name", "large-v3-turbo")
    monkeypatch.setattr("app.config.settings.whisper_model_dir", "./models/whisper")
    monkeypatch.setattr("app.config.settings.device", "cpu")


def _install_mock_faster_whisper(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    mock_model_class = MagicMock(name="WhisperModel")
    mock_instance = MagicMock(name="whisper_model_instance")
    mock_model_class.return_value = mock_instance

    faster_whisper = types.ModuleType("faster_whisper")
    faster_whisper.WhisperModel = mock_model_class
    monkeypatch.setitem(sys.modules, "faster_whisper", faster_whisper)
    return mock_model_class


def test_whisper_service_lazy_loads_on_first_use(
    monkeypatch: pytest.MonkeyPatch,
    whisper_settings: None,
) -> None:
    mock_model_class = _install_mock_faster_whisper(monkeypatch)
    service = WhisperService()

    assert service.is_loaded is False

    model = service.get_model()

    assert service.is_loaded is True
    assert model is mock_model_class.return_value
    mock_model_class.assert_called_once_with(
        "large-v3-turbo",
        device="cpu",
        compute_type="int8_float32",
        download_root=str(resolve_whisper_model_dir()),
    )


def test_whisper_service_loads_model_only_once(
    monkeypatch: pytest.MonkeyPatch,
    whisper_settings: None,
) -> None:
    mock_model_class = _install_mock_faster_whisper(monkeypatch)
    service = WhisperService()

    service.ensure_loaded()
    service.ensure_loaded()
    service.get_model()

    mock_model_class.assert_called_once()


@pytest.mark.asyncio
async def test_whisper_service_async_load(
    monkeypatch: pytest.MonkeyPatch,
    whisper_settings: None,
) -> None:
    mock_model_class = _install_mock_faster_whisper(monkeypatch)
    service = WhisperService()

    await service.ensure_loaded_async()

    assert service.is_loaded is True
    mock_model_class.assert_called_once()


def test_whisper_service_raises_when_faster_whisper_missing(
    monkeypatch: pytest.MonkeyPatch,
    whisper_settings: None,
) -> None:
    monkeypatch.delitem(sys.modules, "faster_whisper", raising=False)
    original_import = builtins.__import__

    def blocked_import(
        name: str,
        globals: dict | None = None,
        locals: dict | None = None,
        fromlist: tuple[str, ...] = (),
        level: int = 0,
    ) -> object:
        if name == "faster_whisper":
            raise ImportError("faster-whisper not installed")
        return original_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", blocked_import)
    service = WhisperService()

    with pytest.raises(WhisperModelNotAvailableError, match="faster-whisper is not installed"):
        service.ensure_loaded()


def test_whisper_service_raises_on_model_load_failure(
    monkeypatch: pytest.MonkeyPatch,
    whisper_settings: None,
) -> None:
    mock_model_class = _install_mock_faster_whisper(monkeypatch)
    mock_model_class.side_effect = RuntimeError("CUDA unavailable")
    service = WhisperService()

    with pytest.raises(WhisperModelLoadError, match="Failed to load Whisper model"):
        service.ensure_loaded()


@pytest.mark.parametrize(
    ("device_setting", "expected_device", "expected_compute_type"),
    [
        ("cpu", "cpu", "int8_float32"),
        ("cuda", "cuda", "int8"),
        ("mps", "cpu", "int8_float32"),
        ("unknown", "cpu", "int8_float32"),
    ],
)
def test_resolve_device_and_compute_type(
    monkeypatch: pytest.MonkeyPatch,
    device_setting: str,
    expected_device: str,
    expected_compute_type: str,
) -> None:
    monkeypatch.setattr("app.config.settings.device", device_setting)

    assert _resolve_device() == expected_device
    assert _resolve_compute_type(expected_device) == expected_compute_type
