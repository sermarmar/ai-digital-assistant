import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    model_size: str
    device: str
    compute_type: str
    default_language: str | None


def load_config() -> Config:
    return Config(
        model_size=os.environ.get("WHISPER_MODEL", "small"),
        device=os.environ.get("WHISPER_DEVICE", "cpu"),
        compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
        # Vacío = detección automática del idioma
        default_language=os.environ.get("WHISPER_LANGUAGE", "es") or None,
    )
