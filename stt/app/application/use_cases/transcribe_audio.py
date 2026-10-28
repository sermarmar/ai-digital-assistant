from typing import BinaryIO

from app.application.ports.outbound.speech_recognizer import SpeechRecognizer
from app.domain.errors import EmptyAudioError
from app.domain.transcript import Transcript


class TranscribeAudio:
    def __init__(self, recognizer: SpeechRecognizer, default_language: str | None) -> None:
        self._recognizer = recognizer
        self._default_language = default_language

    def execute(self, audio: BinaryIO, language: str | None = None) -> Transcript:
        if _is_empty(audio):
            raise EmptyAudioError()
        return self._recognizer.recognize(audio, language or self._default_language)


def _is_empty(audio: BinaryIO) -> bool:
    empty = not audio.read(1)
    audio.seek(0)
    return empty
