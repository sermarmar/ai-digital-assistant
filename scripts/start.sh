#!/usr/bin/env bash
# Arranca la app en local: stt (Whisper), api y web. Ctrl+C los para los tres.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "Falta .env: ejecuta antes scripts/setup.sh"; exit 1; }
[[ -d stt/.venv ]] || { echo "Falta el entorno de Python de stt: ejecuta antes scripts/setup.sh"; exit 1; }

# stt lee su configuración (WHISPER_*) del entorno; api la lee él mismo con --env-file
set -a
source .env
set +a

npm run build --prefix api

# Los procesos en segundo plano no reciben Ctrl+C, así que se paran aquí al salir
trap 'kill $(jobs -p) 2>/dev/null' EXIT INT TERM

# Los puertos salen de .env: el de stt, del final de STT_URL (http://127.0.0.1:8000)
STT_PORT="${STT_URL##*:}"
API_PORT="${API_PORT:-3000}"

# La primera vez descarga el modelo de Whisper a data/models, y tarda unos minutos
HF_HOME="$PWD/data/models" stt/.venv/bin/uvicorn app.main:app --app-dir stt --host 127.0.0.1 --port "$STT_PORT" &
node --env-file=.env api/dist/main.js &
# Vite redirige /api a esta dirección (ver web/vite.config.ts)
API_URL="http://127.0.0.1:$API_PORT" npm run dev --prefix web &

echo "Abre en Chrome o Edge la dirección que muestra Vite (normalmente http://localhost:5173). Ctrl+C para parar."
wait
