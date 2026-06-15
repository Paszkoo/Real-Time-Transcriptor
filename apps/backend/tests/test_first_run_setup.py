from pathlib import Path
from unittest.mock import MagicMock

import httpx
import pytest

from scripts import first_run_setup as setup


@pytest.fixture
def whisper_model_dir(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    model_dir = tmp_path / "models" / "whisper"
    monkeypatch.setattr(setup, "resolve_whisper_model_dir", lambda: model_dir)
    return model_dir


def test_emit_progress_formats_structured_line(capsys: pytest.CaptureFixture[str]) -> None:
    setup.emit_progress(45, "Downloading model…")

    assert capsys.readouterr().out == "PROGRESS 45|Downloading model…\n"


def test_emit_progress_clamps_percent(capsys: pytest.CaptureFixture[str]) -> None:
    setup.emit_progress(-5, "starting")
    assert capsys.readouterr().out == "PROGRESS 0|starting\n"

    setup.emit_progress(150, "done")
    assert capsys.readouterr().out == "PROGRESS 100|done\n"


def test_setup_marker_roundtrip(whisper_model_dir: Path) -> None:
    assert setup.is_setup_complete() is False
    assert setup.setup_marker_path() == whisper_model_dir / ".setup-complete"

    setup.mark_setup_complete()

    assert setup.is_setup_complete() is True
    assert setup.setup_marker_path().read_text(encoding="utf-8") == "ok\n"


def test_ensure_ollama_installed_exits_when_cli_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(setup.shutil, "which", lambda _name: None)

    with pytest.raises(SystemExit) as exc_info:
        setup.ensure_ollama_installed()

    assert exc_info.value.code == setup.EXIT_OLLAMA_MISSING


def test_ensure_ollama_running_exits_when_service_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_http_error(*_args, **_kwargs):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(setup.httpx, "get", raise_http_error)

    with pytest.raises(SystemExit) as exc_info:
        setup.ensure_ollama_running()

    assert exc_info.value.code == setup.EXIT_OLLAMA_UNREACHABLE


def test_main_skips_when_setup_already_complete(
    monkeypatch: pytest.MonkeyPatch,
    whisper_model_dir: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    setup.mark_setup_complete()
    load_settings = MagicMock()
    monkeypatch.setattr(setup, "load_runtime_settings", load_settings)

    setup.main()

    load_settings.assert_not_called()
    output = capsys.readouterr().out
    assert "PROGRESS 100|Model setup already completed." in output
    assert "skipping" in output.lower()
