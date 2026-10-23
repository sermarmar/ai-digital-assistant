from typing import Annotated

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse

from app.application.ports.inbound.transcribe_audio import TranscribeAudioUseCase
from app.domain.errors import EmptyAudioError, UnreadableAudioError
from app.domain.transcript import Transcript


def create_http_app(transcribe_audio: TranscribeAudioUseCase, model_name: str) -> FastAPI:
    app = FastAPI(title="stt")

    async def bad_audio(_request: Request, error: Exception) -> JSONResponse:
        return JSONResponse(status_code=400, content={"error": str(error)})

    app.add_exception_handler(EmptyAudioError, bad_audio)
    app.add_exception_handler(UnreadableAudioError, bad_audio)

    @app.get("/health")
    def health() -> dict:
        return {"ok": True, "model": model_name}

    # Función síncrona a propósito: FastAPI la ejecuta en un hilo aparte
    # y Whisper no bloquea el resto de peticiones (por ejemplo /health)
    @app.post("/transcribe")
    def transcribe(
        audio: Annotated[UploadFile, File()],
        language: Annotated[str | None, Form()] = None,
    ) -> dict:
        transcript = transcribe_audio.execute(audio.file.read(), language)
        return _to_json(transcript)

    return app


# Mismo formato (camelCase) que el tipo Transcript del servicio api
def _to_json(transcript: Transcript) -> dict:
    return {
        "text": transcript.text,
        "language": transcript.language,
        "durationSeconds": transcript.duration_seconds,
        "segments": [
            {"startSeconds": s.start_seconds, "endSeconds": s.end_seconds, "text": s.text}
            for s in transcript.segments
        ],
    }
