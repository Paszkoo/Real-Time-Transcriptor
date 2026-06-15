from pathlib import Path

from app.config import settings
from app.modules.audio.errors import InvalidFilePathError


def resolve_allowed_audio_file(file_path: str | Path) -> Path:
    resolved = Path(file_path).expanduser().resolve()
    allowed_roots = _allowed_roots()

    if not any(_is_under_root(resolved, root) for root in allowed_roots):
        allowed = ", ".join(str(root) for root in allowed_roots)
        raise InvalidFilePathError(
            f"Audio file path must be inside an allowed directory. Allowed roots: {allowed}"
        )

    return resolved


def _allowed_roots() -> list[Path]:
    configured = [
        Path(entry.strip()).expanduser().resolve()
        for entry in settings.audio_file_roots.split(",")
        if entry.strip()
    ]
    if configured:
        return configured

    return [Path.home().resolve()]


def _is_under_root(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True
