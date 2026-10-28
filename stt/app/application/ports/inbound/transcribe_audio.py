from typing import BinaryIO, Protocol

from app.domain.transcript import Transcript


class TranscribeAudioUseCase(Protocol):
    def execute(self, audio: BinaryIO, language: str | None = None) -> Transcript:
        """Si no se indica idioma, se usa el idioma por defecto del servicio."""
        ...
