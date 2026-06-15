import json
from pathlib import Path

from app.config import resolve_session_data_dir, settings
from app.modules.settings.runtime import runtime_settings


def _settings_path() -> Path:
    return resolve_session_data_dir() / "settings.json"


def load_runtime_settings() -> None:
    path = _settings_path()
    if not path.is_file():
        runtime_settings.save_session_audio = settings.save_session_audio
        return

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        runtime_settings.save_session_audio = settings.save_session_audio
        return

    if isinstance(data.get("save_session_audio"), bool):
        runtime_settings.save_session_audio = data["save_session_audio"]


def save_runtime_settings() -> None:
    data_dir = resolve_session_data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)
    _settings_path().write_text(
        json.dumps({"save_session_audio": runtime_settings.save_session_audio}),
        encoding="utf-8",
    )
