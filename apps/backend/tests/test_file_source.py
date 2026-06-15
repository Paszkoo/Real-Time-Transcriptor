from pathlib import Path

import pytest

from app.modules.audio.errors import (
    AudioFileNotFoundError,
    InvalidFilePathError,
    UnsupportedAudioFormatError,
)
from app.modules.audio.file_source import FileAudioSource


def test_file_source_rejects_missing_file(tmp_path: Path) -> None:
    source = FileAudioSource(tmp_path / "missing.wav")

    with pytest.raises(AudioFileNotFoundError):
        source.start_stream()


def test_file_source_rejects_unsupported_extension(tmp_path: Path) -> None:
    file_path = tmp_path / "sample.ogg"
    file_path.write_bytes(b"fake")

    source = FileAudioSource(file_path)

    with pytest.raises(UnsupportedAudioFormatError):
        source.start_stream()


def test_file_source_rejects_path_outside_allowed_roots(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    allowed_dir = tmp_path / "allowed"
    allowed_dir.mkdir()
    outside_dir = tmp_path / "outside"
    outside_dir.mkdir()
    outside_file = outside_dir / "sample.wav"
    outside_file.write_bytes(b"fake")

    monkeypatch.setattr(
        "app.modules.audio.path_validation.settings.audio_file_roots", str(allowed_dir)
    )

    with pytest.raises(InvalidFilePathError):
        FileAudioSource(outside_file)


def test_file_source_lists_no_devices(tmp_path: Path) -> None:
    file_path = tmp_path / "sample.wav"
    file_path.write_bytes(b"fake")
    source = FileAudioSource(file_path)

    assert source.list_devices() == []
