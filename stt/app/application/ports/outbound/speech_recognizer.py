from typing import BinaryIO, Protocol

from app.domain.transcript import Transcript


class SpeechRecognizer(Protocol):
    def recognize(self, audio: BinaryIO, language: str | None) -> Transcript:
        """audio es un archivo de audio o de vídeo. language=None detecta el idioma automáticamente.
        Lanza UnreadableAudioError si no puede decodificarlo y NoAudioTrackError si no tiene audio."""
        ...
