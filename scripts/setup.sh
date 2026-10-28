#!/usr/bin/env bash
# Prepara el proyecto la primera vez: dependencias de api y web, entorno de Python de stt y archivo .env.
# Se puede volver a ejecutar sin problema (por ejemplo, tras cambiar dependencias).
set -euo pipefail
cd "$(dirname "$0")/.."

command -v node >/dev/null || { echo "Falta Node.js 22 o posterior"; exit 1; }
command -v python3 >/dev/null || { echo "Falta Python 3 (3.10 o posterior)"; exit 1; }

npm install --prefix api
npm install --prefix web

# Entorno de Python solo para stt, para no mezclar sus paquetes con los del sistema
[[ -d stt/.venv ]] || python3 -m venv stt/.venv
# En Windows, venv deja los ejecutables en Scripts/ en lugar de bin/
VENV_BIN=stt/.venv/bin
[[ -d stt/.venv/Scripts ]] && VENV_BIN=stt/.venv/Scripts
"$VENV_BIN/pip" install -r stt/requirements.txt

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Creado .env a partir de .env.example. Añade tu token de Claude (ver README)."
fi

echo "Listo. Arranca la app con: scripts/start.sh"
