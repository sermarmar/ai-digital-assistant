from typing import Protocol

from app.domain.transcript import Transcript


class TranscribeAudioUseCase(Protocol):
    def execute(self, audio: bytes, language: str | None = None) -> Transcript:
        """Si no se indica idioma, se usa el idioma por defecto del servicio."""
        ...
