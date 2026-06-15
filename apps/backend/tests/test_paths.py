import sys
from pathlib import Path

import pytest

from app import paths


def test_is_frozen_defaults_to_false(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delattr(sys, "frozen", raising=False)
    assert paths.is_frozen() is False


def test_backend_root_uses_executable_parent_when_frozen(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    fake_exe = tmp_path / "bundle" / "rtt-backend.exe"
    fake_exe.parent.mkdir(parents=True)
    fake_exe.write_text("stub", encoding="utf-8")

    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "executable", str(fake_exe))

    assert paths.backend_root() == fake_exe.parent.resolve()


def test_repo_root_matches_backend_root_when_frozen(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    fake_exe = tmp_path / "bundle" / "rtt-backend.exe"
    fake_exe.parent.mkdir(parents=True)
    fake_exe.write_text("stub", encoding="utf-8")

    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "executable", str(fake_exe))

    assert paths.repo_root() == paths.backend_root()


def test_backend_root_points_at_backend_package_in_dev(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delattr(sys, "frozen", raising=False)
    root = paths.backend_root()
    assert (root / "app").is_dir()
    assert (root / "pyproject.toml").is_file()
