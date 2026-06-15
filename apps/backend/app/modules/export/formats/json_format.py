import json
from dataclasses import asdict

from app.modules.export.payload import ExportSessionData


def _serialize(value: object) -> object:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    return value


def render_json(data: ExportSessionData) -> bytes:
    payload = _serialize(asdict(data))
    return json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")
