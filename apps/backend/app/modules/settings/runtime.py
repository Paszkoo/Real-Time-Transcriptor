from dataclasses import dataclass

from app.config import settings


@dataclass
class RuntimeSettings:
    save_session_audio: bool = settings.save_session_audio


runtime_settings = RuntimeSettings()
