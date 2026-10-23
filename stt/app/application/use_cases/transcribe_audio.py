from app.application.ports.outbound.speech_recognizer import SpeechRecognizer
from app.domain.errors import EmptyAudioError
from app.domain.transcript import Transcript


class TranscribeAudio:
    def __init__(self, recognizer: SpeechRecognizer, default_language: str | None) -> None:
        self._recognizer = recognizer
        self._default_language = default_language

    def execute(self, audio: bytes, language: str | None = None) -> Transcript:
        if not audio:
            raise EmptyAudioError()
        return self._recognizer.recognize(audio, language or self._default_language)
