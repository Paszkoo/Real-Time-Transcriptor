from dataclasses import dataclass

from rtt_shared.settings import WhisperModelOptionResponse


@dataclass(frozen=True)
class WhisperModelOption:
    id: str
    label: str
    size_gb: float
    vram_gb: float | None


WHISPER_MODEL_CATALOG: tuple[WhisperModelOption, ...] = (
    WhisperModelOption(id="small", label="Small", size_gb=0.5, vram_gb=2.0),
    WhisperModelOption(id="medium", label="Medium", size_gb=1.5, vram_gb=5.0),
    WhisperModelOption(id="large-v3-turbo", label="Large v3 Turbo", size_gb=1.6, vram_gb=6.0),
)


def list_whisper_models() -> list[WhisperModelOption]:
    return list(WHISPER_MODEL_CATALOG)


def is_valid_whisper_model(model_name: str) -> bool:
    return any(option.id == model_name for option in WHISPER_MODEL_CATALOG)


def list_whisper_model_responses() -> list[WhisperModelOptionResponse]:
    return [
        WhisperModelOptionResponse(
            id=option.id,
            label=option.label,
            size_gb=option.size_gb,
            vram_gb=option.vram_gb,
        )
        for option in WHISPER_MODEL_CATALOG
    ]
