# Asistente de reuniones

Graba desde el navegador el audio de una videollamada (o de cualquier pestaña), lo transcribe con Whisper en tu ordenador y genera con Claude:

- un resumen con decisiones, tareas (con responsable) y temas,
- un esquema en forma de mapa mental, que puedes editar y descargar.

Todo corre en local, sin Docker. El audio no sale de tu ordenador ni se guarda. La transcripción sí se guarda en una base de datos SQLite local (`data/reuniones.db`) y se envía a Claude para generar el resumen.

## Requisitos

- **Node.js 22** o posterior.
- **Python 3.10** o posterior (probado con 3.12).
- **Chrome o Edge de escritorio** para grabar. Firefox y Safari no permiten capturar el audio que se comparte.
- **Claude**, una de estas dos opciones:
  - Una suscripción Pro o superior y [Claude Code](https://code.claude.com) instalado. Es la opción por defecto y no se paga por uso.
  - Una clave de API de Anthropic, que se paga por token.
- Unos **2 GB de disco**: dependencias de Node y Python, y medio GB del modelo de Whisper.

## Arrancar en local

Todo se ejecuta desde la carpeta del proyecto, en tu ordenador. No hace falta Docker.

| Cuándo | Qué hacer |
|---|---|
| Solo la primera vez (y cuando cambien las dependencias) | `scripts/setup.sh` y poner el token de Claude en `.env` |
| Cada vez que quieras usar la app | `scripts/start.sh` y abrir http://localhost:5173 |
| Para pararla | `Ctrl+C` en la terminal de `scripts/start.sh` |

### 1. Instalar (solo la primera vez)

1. Instala las dependencias y crea tu `.env`:

   ```bash
   scripts/setup.sh
   ```

   Instala lo que necesitan `api` y `web` (npm), crea un entorno de Python para `stt` en `stt/.venv` y copia `.env.example` a `.env` si no existe.

2. Genera el token de tu suscripción de Claude:

   ```bash
   claude setup-token
   ```

   Se abre el navegador. Entra con tu cuenta y autoriza. La terminal muestra un token que empieza por `sk-ant-oat01-` y dura un año.

   Si en este ordenador ya has iniciado sesión en Claude Code, puedes saltarte este paso y dejar el token vacío: se usa ese inicio de sesión.

3. Pega el token en `.env`, en la línea `CLAUDE_CODE_OAUTH_TOKEN=`, **en una sola línea**. La terminal suele partirlo en dos, así que únelo sin espacios. En macOS puedes copiarlo entero y ejecutar esto desde la carpeta del proyecto, que quita los saltos de línea y lo escribe por ti:

   ```bash
   TOKEN=$(pbpaste | tr -d '[:space:]'); [[ "$TOKEN" == sk-ant-oat01-* ]] && sed -i '' "s|^CLAUDE_CODE_OAUTH_TOKEN=.*|CLAUDE_CODE_OAUTH_TOKEN=$TOKEN|" .env && echo "Token guardado"; unset TOKEN
   ```

   Deja `ANTHROPIC_API_KEY` vacía.

### 2. Arrancar

Desde la carpeta del proyecto:

```bash
scripts/start.sh
```

Arranca en esa misma terminal las tres partes de la app:

| Parte | Qué hace | Dirección |
|---|---|---|
| `stt` | Transcribe el audio con Whisper | http://127.0.0.1:8000 |
| `api` | Coordina Whisper y Claude, y guarda las reuniones | http://127.0.0.1:3000 |
| `web` | La página que usas en el navegador | http://localhost:5173 |

La primera vez `stt` descarga el modelo de Whisper a `data/models` y tarda unos minutos. Está listo cuando la terminal muestra `Uvicorn running on http://127.0.0.1:8000`.

Abre en Chrome o Edge la dirección que aparece junto a `Local:`, normalmente **http://localhost:5173**. Si ese puerto está ocupado, Vite usa el siguiente libre (5174, 5175…).

### 3. Parar

Pulsa `Ctrl+C` en la terminal de `scripts/start.sh`: se paran las tres partes. Las reuniones están guardadas en `data/reuniones.db` y siguen ahí la próxima vez.

### Arrancar cada parte por separado (opcional)

`scripts/start.sh` hace exactamente esto por ti. Arrancarlas a mano sirve para ver los mensajes de cada parte por separado o reiniciar solo una. Abre tres terminales en la carpeta del proyecto, en este orden:

**Terminal 1, `stt`.** El primer comando carga la configuración de `.env` (modelo e idioma de Whisper):

```bash
set -a; source .env; set +a
```

```bash
HF_HOME="$PWD/data/models" stt/.venv/bin/uvicorn app.main:app --app-dir stt --host 127.0.0.1 --port 8000
```

**Terminal 2, `api`.** Primero se compila y después se arranca:

```bash
npm run build --prefix api
```

```bash
node --env-file=.env api/dist/main.js
```

**Terminal 3, `web`:**

```bash
npm run dev --prefix web
```

Para parar, pulsa `Ctrl+C` en cada terminal. Estos comandos usan los puertos por defecto (8000 y 3000); si los has cambiado en `.env`, usa `scripts/start.sh`.

## Uso

### Grabar una reunión

1. Pulsa **Nueva reunión**.
2. Informa a los participantes de que vas a grabar y marca la casilla de consentimiento (lo exige el RGPD).
3. Deja marcado **Grabar también mi micrófono** si quieres que salga tu voz: lo que se comparte solo trae la voz de los demás.
4. Pulsa **Empezar a grabar** y elige qué compartir:

   | Qué eliges | ¿Se graba el audio? |
   |---|---|
   | **Pestaña** (recomendado) | Sí, el de esa pestaña. Marca *Compartir también el audio de la pestaña*. Vale para Meet, Teams web, Zoom web, YouTube… |
   | **Pantalla completa** | En Windows sí, si marcas *Compartir audio del sistema*. En macOS no. |
   | **Ventana** | No. Chrome no comparte el audio de una ventana. |

   Si no se comparte audio, la app te avisa y puedes volver a intentarlo.

5. Pulsa **Detener** al acabar. También se para sola si dejas de compartir desde la barra del navegador. Antes de procesar puedes escuchar la grabación, descargarla o descartarla.
6. Pulsa **Procesar reunión**.

### Subir un archivo de audio

En la misma pantalla puedes subir un audio que ya tengas (webm, mp3, wav, m4a…).

### El resultado

La reunión pasa por **Transcribiendo** (Whisper) y **Resumiendo** (Claude) hasta quedar **Lista**. La página se actualiza sola, y puedes cerrarla mientras tanto porque el procesado sigue en `api`. Cuando termina verás:

- **Resumen**, decisiones, tareas y temas.
- **Esquema**: si Mermaid no puede dibujarlo, la app pide a Claude que lo corrija (hasta dos veces). Con **Editar** puedes cambiar el código y ver el resultado mientras escribes.
- **Transcripción** con marcas de tiempo.
- **Descargas** en Markdown, JSON, SVG y PNG.
- **Eliminar reunión**, que borra la transcripción, el resumen y el diagrama.

## Suscripción o API

| | `subscription` (por defecto) | `api` |
|---|---|---|
| Cómo se paga | Con tu plan de Claude, sin coste por token | Por token, con la clave de API |
| Qué poner en `.env` | `CLAUDE_CODE_OAUTH_TOKEN` (o nada, si usas el inicio de sesión de Claude Code) | `ANTHROPIC_API_KEY` |
| Límites | Los de tu plan, compartidos con el chat y Claude Code | Los de tu cuenta de API |

Para cambiar de modo, edita `CLAUDE_PROVIDER` en `.env` y vuelve a arrancar con `scripts/start.sh`.

Algunas notas:

- En modo `subscription`, `ANTHROPIC_API_KEY` no se usa aunque tenga valor, así que no te cobrarán por error.
- Para gastar poco del plan, las reuniones largas (más de unos 25 minutos) se trocean: Haiku resume cada trozo y Sonnet hace el resumen final. Si llegas al límite del plan, la reunión muestra el aviso y no se reintenta en bucle.
- La suscripción es de uso personal. Si la app la van a usar otras personas, usa el modo `api`.

## Configuración (`.env`)

| Variable | Para qué sirve | Por defecto |
|---|---|---|
| `CLAUDE_PROVIDER` | `subscription` o `api` | `subscription` |
| `CLAUDE_CODE_OAUTH_TOKEN` | Token de `claude setup-token` (modo `subscription`) | vacío |
| `ANTHROPIC_API_KEY` | Clave de API (modo `api`) | vacía |
| `MODEL_FAST` | Modelo para los trozos de reuniones largas | `claude-haiku-5-5` |
| `MODEL_MAIN` | Modelo para el resumen final y el esquema | `claude-sonnet-5-5` |
| `STT_URL` | Dirección de `stt`; su puerto es en el que arranca | `http://127.0.0.1:8000` |
| `WHISPER_MODEL` | `small`, `medium` o `large-v3`: más grande es más preciso y más lento | `small` |
| `WHISPER_LANGUAGE` | Idioma del audio; si se deja vacío, se detecta solo | `es` |
| `DATABASE_PATH` | Archivo de SQLite, relativo a la carpeta del proyecto | `./data/reuniones.db` |
| `API_PORT` | Puerto de `api` | `3000` |

`stt` y `api` solo escuchan en `127.0.0.1`, y Vite solo en `localhost`: no se puede acceder desde otros equipos de la red.

## Arquitectura

```
Navegador ──► web (Vite :5173) ──/api──► api (Node + Fastify :3000) ──► stt (Whisper :8000)
                                              │                      └──► Claude
                                              └──► data/reuniones.db (SQLite)
```

| Parte | Tecnología | Función |
|---|---|---|
| `web` | React, TypeScript, Vite, Tailwind, Mermaid | Grabación, resultados, historial y descargas |
| `api` | Node.js, TypeScript, Fastify, Drizzle, SQLite (`better-sqlite3`), SDK de Claude | Coordina la transcripción y Claude, y guarda las reuniones |
| `stt` | Python, FastAPI, faster-whisper | Convierte el audio en texto, en local |

Las tres partes siguen arquitectura hexagonal:

- `domain/`: entidades y reglas, sin dependencias.
- `application/`: casos de uso y puertos, que son las interfaces de lo que se necesita del exterior.
- `infrastructure/`: adaptadores que implementan esos puertos (SQLite, Whisper, Claude, HTTP…).
- `main.ts` / `main.py` / `main.tsx`: el único sitio donde se conecta todo.

Las reglas detalladas están en [CLAUDE.md](CLAUDE.md).

## Desarrollo

`scripts/start.sh` ya arranca la web con recarga en caliente: los cambios en `web/` se ven al momento. Si cambias `api/` o `stt/`, para con `Ctrl+C` y vuelve a ejecutar `scripts/start.sh` (compila `api` cada vez que arranca). Si las tienes arrancadas por separado, basta con reiniciar la parte que hayas cambiado.

**Comprobar tipos:**

```bash
npm run typecheck --prefix api
```

```bash
npm run typecheck --prefix web
```

**Cambios en la base de datos.** Edita `api/src/infrastructure/out/sqlite/schema.ts` y genera la migración. Se aplica sola al arrancar `api`.

```bash
npm run db:generate --prefix api
```

**Nuevas dependencias.** Tras cambiar `package.json` o `stt/requirements.txt`, vuelve a ejecutar `scripts/setup.sh`.

## Datos y privacidad

- Todo se guarda en la carpeta `data/`: la base de datos (`reuniones.db`) y el modelo de Whisper (`models/`).
- **El audio no se guarda**: se descarta después de transcribirlo.
- La **transcripción se envía a Anthropic** para generar el resumen. Tenlo en cuenta con reuniones confidenciales y elimina las que no necesites.
- En España y la UE (RGPD) tienes que informar a las personas que grabas y obtener su consentimiento.
- Para **borrar todas las reuniones** de forma irreversible, para la app y borra la base de datos (en el siguiente arranque se crea vacía):

  ```bash
  rm data/reuniones.db*
  ```

## Problemas frecuentes

**«No se ha compartido audio»**: elegiste una ventana o no marcaste la opción de compartir el audio. Vuelve a grabar eligiendo una pestaña y marcando *Compartir también el audio de la pestaña*.

**No aparece la sección «Grabar»**: el navegador no es compatible. Usa Chrome o Edge de escritorio, o sube un archivo de audio.

**En macOS no se oye a los demás**: macOS no deja compartir el audio del sistema desde el navegador. Graba la **pestaña** de la videollamada (Meet, Teams web, Zoom web) en lugar de la aplicación de escritorio.

**«No se ha podido autenticar con la suscripción de Claude»**: el token falta, está incompleto (tiene que estar en una sola línea) o ha caducado. Genera otro con `claude setup-token`, pégalo en `.env` y vuelve a arrancar.

**«Se ha alcanzado el límite de uso de Claude»**: has gastado el límite de tu plan en este periodo. Espera a que se renueve o cambia al modo `api`.

**La transcripción tarda mucho**: Whisper corre en la CPU. Con el modelo `small` en un Intel Core i7 de 6 núcleos tarda aproximadamente el 70 % de la duración del audio: una reunión de una hora tarda unos 40 minutos. `medium` y `large-v3` son más precisos pero bastante más lentos.

**La primera reunión se queda en «Transcribiendo» y falla**: `stt` todavía estaba descargando el modelo. Espera a que en la terminal aparezca `Uvicorn running on http://127.0.0.1:8000` y vuelve a intentarlo.

**`address already in use` (EADDRINUSE) al arrancar**: otro programa usa el puerto 3000 o el 8000 (por ejemplo, Docker Desktop con los contenedores de la versión anterior). Cierra ese programa o cambia `API_PORT` o el puerto de `STT_URL` en `.env`. Si el 5173 está ocupado, Vite usa el siguiente libre y te lo dice en la terminal.
