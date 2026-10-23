# Raíz de composición: el único sitio que conoce todas las piezas y las conecta.
from app.application.use_cases.transcribe_audio import TranscribeAudio
from app.config import load_config
from app.infrastructure.inbound.http_api import create_http_app
from app.infrastructure.outbound.faster_whisper_recognizer import FasterWhisperRecognizer

config = load_config()

# 1. Adaptador de salida (carga el modelo de Whisper en memoria al arrancar)
recognizer = FasterWhisperRecognizer(config.model_size, config.device, config.compute_type)

# 2. Caso de uso, que recibe el adaptador a través de su puerto
transcribe_audio = TranscribeAudio(recognizer, config.default_language)

# 3. Adaptador de entrada (uvicorn sirve este objeto `app`)
app = create_http_app(transcribe_audio, config.model_size)
