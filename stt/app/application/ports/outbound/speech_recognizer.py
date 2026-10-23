from typing import Protocol

from app.domain.transcript import Transcript


class SpeechRecognizer(Protocol):
    def recognize(self, audio: bytes, language: str | None) -> Transcript:
        """language=None detecta el idioma automáticamente.
        Lanza UnreadableAudioError si no puede decodificar el audio."""
        ...
