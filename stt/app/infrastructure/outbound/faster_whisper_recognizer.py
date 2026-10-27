import io

import av
from faster_whisper import WhisperModel

from app.domain.errors import UnreadableAudioError
from app.domain.transcript import Transcript, TranscriptSegment


class FasterWhisperRecognizer:
    def __init__(self, model_size: str, device: str, compute_type: str) -> None:
        # La primera vez descarga el modelo de Hugging Face a HF_HOME (scripts/start.sh lo apunta a data/models)
        self._model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def recognize(self, audio: bytes, language: str | None) -> Transcript:
        try:
            # vad_filter salta los silencios, que es donde Whisper suele inventarse frases
            segments, info = self._model.transcribe(io.BytesIO(audio), language=language, vad_filter=True)
            # segments es un generador: la transcripción ocurre al recorrerlo
            segments = [
                TranscriptSegment(start_seconds=s.start, end_seconds=s.end, text=s.text.strip())
                for s in segments
            ]
        except av.error.FFmpegError as error:  # av (PyAV) viene con faster-whisper y decodifica el audio
            raise UnreadableAudioError() from error

        return Transcript(
            text=" ".join(s.text for s in segments),
            language=info.language,
            duration_seconds=info.duration,
            segments=segments,
        )
