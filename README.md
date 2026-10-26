# Asistente de reuniones

App de escritorio **portable** para **Windows y macOS**: se abre sin instalar nada. Graba el audio de una reunión, lo transcribe con Whisper en tu ordenador y genera con Claude un resumen (decisiones, tareas y temas) y un esquema en forma de mapa mental.

Está hecha con React Native (`react-native-windows` y `react-native-macos`) y vive en la carpeta [`app/`](app).

> **Estado: migración en curso.** La app nueva es todavía una **prueba de viabilidad**: arranca en las dos plataformas y pinta un diagrama de Mermaid dentro de la app. Grabar, transcribir y resumir llegan en las siguientes fases. La versión web anterior (`web/`, `api/`, `stt/` y `docker-compose.yml`) sigue en el repositorio hasta terminar la migración.

## Abrir la app portable

### macOS

1. Descomprime `AsistenteReuniones-macos.zip`.
2. La primera vez, haz **clic derecho sobre `MeetingAssistant.app` → Abrir** y confirma. No está firmada con un certificado de Apple, así que con doble clic macOS no la deja abrir.
3. Si macOS dice que la app «está dañada», quítale la marca de descarga y vuelve a abrirla:

   ```bash
   xattr -dr com.apple.quarantine MeetingAssistant.app
   ```

Necesita macOS 14 o posterior. Se compila para el tipo de Mac donde se genera: la que sale de un Mac Intel también funciona en Apple Silicon, mediante Rosetta 2.

### Windows

1. Descarga el zip `AsistenteReuniones-windows-x64` (ver [Compilar en Windows](#windows-1)) y descomprímelo donde quieras, incluso en un USB.
2. Abre `MeetingAssistant.exe`.
3. Si aparece el aviso de SmartScreen, pulsa **Más información → Ejecutar de todas formas**. El `.exe` no va firmado.

Necesita Windows 10 u 11 de 64 bits. La carpeta lleva todo lo necesario (Windows App SDK y runtime de Visual C++), así que no hay que instalar nada.

## Compilar la versión portable

### macOS

Requisitos: Xcode, CocoaPods, Node.js 22 y unos **8 GB libres** en disco.

```bash
cd app
```

```bash
npm install
```

```bash
npm run build:macos
```

El resultado queda en `app/dist/AsistenteReuniones-macos.zip`. El script ([`build-macos-portable.sh`](app/scripts/build-macos-portable.sh)) ejecuta `pod install`, compila en Release con Xcode y comprime la `.app`.

### Windows

La versión de Windows **no se puede compilar desde un Mac**: necesita Visual Studio en Windows. Hay dos formas.

**Con GitHub Actions (recomendada, no necesitas un PC con Windows).** El workflow [`windows.yml`](.github/workflows/windows.yml) se lanza solo con cada push a la rama `app-react-native` que toque `app/`. También se puede lanzar a mano desde la pestaña **Actions → App Windows (portable) → Run workflow**, o con:

```bash
gh workflow run windows.yml --ref app-react-native
```

Cuando termina, el zip está en la página de la ejecución, en **Artifacts → AsistenteReuniones-windows-x64**. También se puede descargar desde la terminal:

```bash
gh run download --name AsistenteReuniones-windows-x64
```

**En un PC con Windows.** Requisitos:

- Visual Studio 2026 con la carga de trabajo **Desarrollo para el escritorio con C++** y el **Windows SDK 10.0.26100**.
- Node.js 22.
- PowerShell 7 (`pwsh`).

```powershell
cd app
npm ci
npm run build:windows
```

El resultado queda en `app\dist\AsistenteReuniones`. Comprime esa carpeta para llevarla a otro equipo. Si tienes instalado otro Windows SDK, indícalo así:

```powershell
pwsh -File scripts/build-windows-portable.ps1 -WindowsSdkVersion 10.0.22621.0
```

El script es [`build-windows-portable.ps1`](app/scripts/build-windows-portable.ps1), el mismo que usa GitHub Actions. Enlaza los módulos nativos, compila en Release x64 sin paquete MSIX y copia junto al `.exe` el bundle de JavaScript y el runtime de Visual C++.

## Desarrollo (arrancar con recarga en caliente)

### macOS

```bash
cd app
```

```bash
npm install
```

```bash
cd macos && LANG=en_US.UTF-8 pod install && cd ..
```

En una terminal arranca Metro, el servidor que sirve el JavaScript:

```bash
npm start
```

Y en otra compila en Debug y abre la app:

```bash
npm run macos
```

Los cambios en el código TypeScript se ven al momento en la app. Si cambias código nativo (Swift, Podfile) o añades una librería nativa, vuelve a ejecutar `pod install` y `npm run macos`.

### Windows (en un PC con Windows)

1. `npm ci` y `npx react-native autolink-windows` dentro de `app`.
2. `npm start` para arrancar Metro.
3. Abre `app\windows\MeetingAssistant.sln` en Visual Studio, elige **Debug | x64** y pulsa **F5**.

### Comprobar tipos

```bash
npm run typecheck --prefix app
```

## Estructura de `app/`

| Ruta | Qué hay |
|---|---|
| `App.tsx`, `index.js` | Pantalla de la prueba de viabilidad y punto de entrada |
| `assets/mermaid-page.template.html` | Página que carga el WebView para validar y dibujar los diagramas con Mermaid |
| `scripts/build-mermaid-page.mjs` | Mete Mermaid dentro de esa página (se ejecuta solo en `npm install`) |
| `scripts/build-*-portable.*` | Compilación portable de macOS y Windows |
| `macos/` | Proyecto de Xcode |
| `windows/` | Solución de Visual Studio (app Win32 sin MSIX) |

A medida que avance la migración, el código pasará a `app/src/` con la misma arquitectura hexagonal de antes (`domain/`, `application/`, `infrastructure/` y `ui/`). Las reglas detalladas están en [CLAUDE.md](CLAUDE.md).

## Problemas frecuentes

**`pod install` falla con «Unicode Normalization not appropriate for ASCII-8BIT»**: la terminal no usa UTF-8. Ejecútalo como `LANG=en_US.UTF-8 pod install` (el script de compilación ya lo hace).

**Xcode no encuentra archivos de `build/generated/ios/ReactCodegen`**: se ha borrado `app/macos/build`, que también guarda el código que genera `pod install`. Vuelve a ejecutar `pod install` dentro de `app/macos`.

**«No space left on device» al compilar en macOS**: la compilación necesita unos 8 GB libres. La caché de npm (`npm cache clean --force`) y los datos de Docker suelen ser lo que más ocupa.

**Windows: «The Windows SDK version … was not found» (MSB8036)**: indica el SDK que tengas instalado con `-WindowsSdkVersion` (ver [Compilar en Windows](#windows-1)).

**Windows: la app se cierra nada más abrirla**: hay un fallo conocido de React Native Windows en compilaciones Release ([microsoft/react-native-windows#16442](https://github.com/microsoft/react-native-windows/issues/16442)). Si pasa, avisa para revisarlo.
