#!/usr/bin/env bash
# Compila la app de macOS en Release y la deja comprimida en app/dist/AsistenteReuniones-macos.zip.
# El zip se descomprime en cualquier Mac con macOS 14 o posterior y se abre sin instalar nada.
set -euo pipefail
cd "$(dirname "$0")/.."

# CocoaPods falla si la terminal no usa UTF-8
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

# pod install también genera el código nativo de React Native (en macos/build/generated)
(cd macos && pod install)

xcodebuild -workspace macos/MeetingAssistant.xcworkspace -scheme MeetingAssistant-macOS \
  -configuration Release -derivedDataPath macos/build ONLY_ACTIVE_ARCH=YES -quiet

mkdir -p dist
rm -f dist/AsistenteReuniones-macos.zip
ditto -c -k --keepParent macos/build/Build/Products/Release/MeetingAssistant.app dist/AsistenteReuniones-macos.zip
echo "Listo: app/dist/AsistenteReuniones-macos.zip"
