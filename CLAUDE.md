# Asistente de reuniones con IA (web, en local con SQLite) — Contexto del proyecto

## Reglas de trabajo (importante)

- Conversar y comentar siempre en español.
- Git: se puede hacer `git commit` y `git push`, pero solo cuando Sergio lo autorice explícitamente. Nunca hacerlo por iniciativa propia.
- Antes de añadir una dependencia nueva, comentar brevemente por qué hace falta.
- Las credenciales de Claude (clave de API o token de la suscripción) nunca van en el frontend ni en el repositorio: viven en un `.env` (en `.gitignore`) y solo las lee el servicio `api`.
- **Solo modelos de Claude** para todo lo que sea IA generativa (resumen, esquema, diagrama). Ver la excepción de transcripción más abajo.

## Objetivo

Aplicación **web** que corre **en local, sin Docker**. Graba el audio de lo que el usuario comparte (videollamada, página web, chat, reunión de financiación, etc.), lo transcribe y genera:

1. Un **resumen** estructurado.
2. Un **esquema en forma de diagrama** (mapa mental, flowchart o timeline).

Es, en esencia, un asistente de reunión con IA.

## Decisiones tomadas

- Plataforma: **web**, sin Electron ni Tauri. (Se probó una app de escritorio con React Native en la rama `app-react-native`; se abandonó porque en Windows se cerraba al abrirla. La rama se conserva.)
- Ejecución: **en local, sin Docker** (`scripts/setup.sh` la primera vez y `scripts/start.sh` para arrancar). Docker Desktop daba problemas en el Mac de Sergio (Intel, disco casi lleno).
- Base de datos: **SQLite**, un archivo local (`data/reuniones.db`, configurable con `DATABASE_PATH`) a través de `better-sqlite3` y Drizzle. **No se usa Supabase ni Postgres.** El backend propio (`api`) es el único que habla con la base de datos; el navegador nunca accede directamente.
- Qué se guarda: transcripción, resumen, decisiones, tareas, temas y diagrama Mermaid. **El audio no se guarda por defecto** (se descarta tras transcribir); si más adelante se quiere conservar, se guardaría como archivo dentro de `data/`, nunca dentro de la base de datos.
- Sin cuentas de usuario por ahora (uso personal en local).
- El resultado también se puede descargar (Markdown, JSON, SVG/PNG del diagrama).
- IA generativa: **solo Claude**. Sergio tiene el **plan Pro**, así que el modo por defecto es usar su suscripción mediante el Agent SDK (sin coste por token), con la API de Anthropic (de pago por token) como alternativa intercambiable. Ver la sección "Proveedor de Claude".
- El audio que se necesita es el del **sistema completo** (lo que suena por los altavoces), más el micrófono del usuario.

## Decisión pendiente

Definir si es una herramienta personal o un producto para publicar. Por ahora es personal y local; si pasara a producto habría que añadir cuentas, límites de uso, costes por usuario y cumplimiento RGPD.

## Arquitectura

Tres procesos que arranca `scripts/start.sh` en la misma terminal (`Ctrl+C` los para todos):

| Parte | Tecnología | Función |
|---|---|---|
| `web` | React + TypeScript + Vite + Tailwind CSS; servidor de desarrollo de Vite (`http://localhost:5173`), que redirige `/api` a `api` | Captura de audio, interfaz, render del diagrama con `mermaid.js`, historial de reuniones, descargas. |
| `api` | Node.js + TypeScript + Fastify con `@anthropic-ai/sdk`, Drizzle ORM y `better-sqlite3` (`127.0.0.1:3000`) | Recibe el audio, coordina `stt` y Claude, y guarda y lee reuniones en SQLite. Lee las credenciales de Claude del `.env` (`node --env-file=.env`). |
| `stt` | Python + FastAPI + `faster-whisper` en un entorno virtual (`stt/.venv`), servido con uvicorn (`127.0.0.1:8000`) | Transcribe el audio a texto. |

Flujo: navegador graba → envía el audio a `api` → `api` lo pasa a `stt` → texto → `api` llama a Claude → resumen JSON + Mermaid → `api` lo guarda en SQLite → el navegador lo muestra.

Variables de entorno (`.env`, no versionado; incluir un `.env.example`):
- `CLAUDE_PROVIDER=subscription` (por defecto) o `api`
- `ANTHROPIC_API_KEY` (solo en modo `api`; **debe estar vacía en modo `subscription`**, porque si existe se usa y se cobra por token)
- `CLAUDE_CODE_OAUTH_TOKEN` (solo en modo `subscription`): token de un año generado con `claude setup-token`. El adaptador de suscripción solo pasa al subproceso de Claude Code una lista mínima de variables, así que `ANTHROPIC_API_KEY` nunca llega a usarse en ese modo.
- `STT_URL=http://127.0.0.1:8000` (`scripts/start.sh` arranca `stt` en el puerto de esta URL)
- `WHISPER_MODEL=small`, `WHISPER_LANGUAGE=es`
- `DATABASE_PATH=./data/reuniones.db` (relativa a la raíz del proyecto, desde donde `scripts/start.sh` arranca `api`)
- `API_PORT=3000`
- `MODEL_FAST=claude-haiku-5-5`
- `MODEL_MAIN=claude-sonnet-5-5`

Notas sobre la base de datos:
- Migraciones versionadas con Drizzle (`drizzle-kit`, dialecto `sqlite`), que se aplican al arrancar `api`.
- SQLite no tiene tipos uuid, fecha ni JSON: los ids son UUID guardados como texto (`crypto.randomUUID()`), las fechas se guardan en milisegundos (`timestamp_ms`) y los campos JSON como texto (`text({ mode: 'json' })`).
- Las claves foráneas (y el borrado en cascada) solo funcionan con `PRAGMA foreign_keys = ON`, que se activa al abrir la conexión junto con `journal_mode = WAL`.
- `better-sqlite3` está fijado a la serie 12: la 13.0.3 provoca un segmentation fault al abrir la base de datos en este Mac (Intel, Node 22.13).
- Todo lo local (base de datos y modelo de Whisper en `data/models`) vive en `data/`, que está en `.gitignore`.
- `api` y `stt` escuchan solo en `127.0.0.1`, y Vite solo en `localhost`.

## Arquitectura hexagonal (obligatoria en todos los servicios)

Todo el código sigue arquitectura hexagonal (puertos y adaptadores). El objetivo es que Sergio pueda entender el proyecto por capas, así que prima la claridad sobre la brevedad.

Regla principal: **las dependencias solo apuntan hacia dentro**.

```
infrastructure  →  application  →  domain
(adaptadores)      (casos de uso     (entidades y reglas,
                    + puertos)        sin dependencias)
```

| Capa | Qué contiene | Qué puede importar |
|---|---|---|
| `domain/` | Entidades, value objects, errores de dominio y reglas de negocio. TypeScript puro. | Nada de fuera de `domain/`. Ni librerías (salvo utilidades del lenguaje), ni Fastify, ni Drizzle, ni SDKs. |
| `application/ports/in/` | Puertos de entrada: interfaces de los casos de uso que la app ofrece. | `domain/` |
| `application/ports/out/` | Puertos de salida: interfaces de lo que la app necesita del exterior (`Transcriber`, `TextGenerator`, `MeetingRepository`...). | `domain/` |
| `application/use-cases/` | Implementaciones de los puertos de entrada: lo que se puede pedir desde fuera. Reciben sus dependencias por constructor. | `domain/`, `application/ports/`, `application/services/` y librerías puras sin E/S (como `zod`) |
| `application/services/` | Lógica de aplicación que usan varios casos de uso (por ejemplo `MeetingSummarizer` y `DiagramGenerator`). Hablan con el exterior solo a través de puertos de salida. | `domain/`, `application/ports/out/` y librerías puras sin E/S |
| `infrastructure/in/` | Adaptadores de entrada (driving): rutas HTTP, CLI... Traducen la petición y llaman a un puerto de entrada. | Todo lo anterior + librerías |
| `infrastructure/out/` | Adaptadores de salida (driven): SQLite, Whisper, Claude... Implementan un puerto de salida. | Todo lo anterior + librerías |
| `config/` | Lectura y validación de variables de entorno. | Librerías de validación |
| `main.ts` | Raíz de composición: crea los adaptadores, los inyecta en los casos de uso y arranca el servidor. Es el único sitio que conoce todas las piezas. | Todo |

Convenciones:

- Un archivo por puerto y por caso de uso. Los nombres de archivo en `kebab-case`; las interfaces de puerto sin prefijo `I` (`MeetingRepository`, no `IMeetingRepository`).
- Inyección de dependencias manual en `main.ts`, sin contenedores de DI ni decoradores.
- Los adaptadores convierten entre el modelo de dominio y su formato externo (filas de Drizzle, JSON HTTP, respuesta de Claude). Los tipos de Drizzle o de Fastify nunca salen de `infrastructure/`.
- El acceso a Claude es el puerto `TextGenerator` con dos adaptadores (`subscription` y `api`); `main.ts` elige uno según `CLAUDE_PROVIDER`. Esto sustituye al "módulo único `claude-client.ts`".
- Código (identificadores) en inglés; textos de interfaz, comentarios y mensajes de error de cara al usuario en español. Las claves del JSON que devuelve Claude (`resumen`, `decisiones`, `tareas`, `temas`) y los estados de reunión se quedan en español.
- `web` sigue la misma idea con `domain/`, `application/`, `infrastructure/` y `ui/`:
  - `ui/` (componentes React) es el único adaptador de entrada. Llama directamente a las clases de `application/use-cases/`, que le llegan por contexto (`ui/services.tsx`); por eso en `web` no hay `ports/in` y los puertos de salida están en `application/ports/` sin subcarpeta.
  - `infrastructure/` tiene los adaptadores de salida: `HttpMeetingGateway` (API vía `/api`), `BrowserAudioCapture` (`getDisplayMedia` + micrófono + Web Audio + `MediaRecorder`), `MermaidDiagramRenderer` y `BrowserFileSaver`.
  - `main.tsx` es la raíz de composición. Los imports no llevan extensión `.js` (Vite resuelve los módulos), a diferencia de `api`.
  - En desarrollo, Vite redirige `/api` al servicio `api` (`API_URL`, por defecto `http://127.0.0.1:3000`), así que no hace falta CORS. `stt` (Python) usa las mismas tres capas aunque sea pequeño; como `in` es palabra reservada en Python, ahí las carpetas se llaman `ports/inbound`, `ports/outbound`, `infrastructure/inbound` e `infrastructure/outbound`, y los puertos son `typing.Protocol`.

## Modelo de datos inicial (propuesta)

- `meetings`: id (uuid), título, fecha de creación, duración en segundos, idioma, estado (`transcribiendo`, `resumiendo`, `listo`, `error`).
- `transcripts`: id, meeting_id, texto completo, segmentos con timestamps (JSON).
- `summaries`: id, meeting_id, resumen, decisiones (JSON), tareas (JSON con `descripcion` y `responsable`), temas (JSON), modelo usado.
- `diagrams`: id, meeting_id, tipo (`mindmap`, `flowchart`, `timeline`), código Mermaid.

Borrar una reunión debe borrar en cascada todo lo asociado. Ofrecer en la interfaz un botón de "eliminar reunión".

## Excepción: la transcripción NO la hace Claude

Claude trabaja con texto e imágenes, **no transcribe audio**. Por eso hace falta un componente de voz a texto aparte. Para respetar "solo Claude para la IA generativa" y mantenerlo todo local, se usa **Whisper en local** (servicio `stt` en Python): no depende de ninguna API de terceros y el audio no sale del ordenador. Es el único componente de IA que no es de Claude, y solo convierte audio en texto.

- Modelo inicial: `small` o `medium` de Whisper para español; probar `large-v3` si el equipo lo aguanta.
- Corre en la CPU (`WHISPER_DEVICE=cpu`, `int8`), que es lo que hay en el Mac Intel de Sergio. Con GPU NVIDIA se podría usar `cuda`.
- El modelo se descarga de Hugging Face la primera vez a `data/models` (`HF_HOME`, lo fija `scripts/start.sh`).
- Diarización (quién habla): queda fuera del MVP. Si hace falta, valorar `pyannote` más adelante.

## Captura de audio en web (limitaciones reales)

Se usa `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })`. Funciona porque `localhost` cuenta como contexto seguro. El navegador muestra su propio selector y lo que se puede capturar depende de lo que elija el usuario:

| Lo que elige el usuario | ¿Hay audio? |
|---|---|
| **Pestaña** de Chrome/Edge | Sí, solo el audio de esa pestaña (vale para Meet, Teams web, Zoom web, YouTube...). |
| **Pantalla completa** en Windows | Sí, audio de todo el sistema si marca "Compartir audio del sistema". |
| **Ventana** | **No**. Chrome no da audio al compartir una ventana. |
| macOS | Solo audio de pestaña; el audio del sistema completo no está disponible desde la web. |

Consecuencias de diseño:

- No se puede "elegir una ventana y coger el audio" en web. Hay que guiar al usuario hacia **pestaña** o **pantalla completa**.
- Navegadores soportados: Chrome y Edge de escritorio. Firefox y Safari no sirven para captura de audio.
- Tras la selección, comprobar `stream.getAudioTracks().length`; si es 0, avisar de que no se marcó compartir audio y ofrecer repetir.
- Micrófono aparte con `getUserMedia`, porque el audio compartido solo trae las voces de los demás. Mezclar ambas pistas con Web Audio API (`AudioContext`, `createMediaStreamSource`, `createMediaStreamDestination`) y grabar con `MediaRecorder`.
- Requiere un gesto del usuario (clic) para iniciar.

## Proveedor de Claude (suscripción Pro o API)

Todo el acceso a Claude se aísla en **un único módulo** del servicio `api` (por ejemplo `claude-client.ts`) con una interfaz simple, algo como `generate({ model, system, prompt }) → texto`, y dos implementaciones intercambiables según `CLAUDE_PROVIDER`:

1. **`subscription` (por defecto):** usa `@anthropic-ai/claude-agent-sdk` (o `claude -p`) autenticado con la cuenta Pro de Sergio. Según la ayuda oficial, este uso consume los límites de la suscripción y no se cobra por token.
2. **`api`:** usa `@anthropic-ai/sdk` con `ANTHROPIC_API_KEY`, de pago por token. Será la opción obligatoria si algún día la app se publica como producto para otros.

Consideraciones del modo `subscription`:

- Claude Code es un agente completo. Para usarlo como simple generador de texto hay que **desactivar las herramientas y limitar a un turno** (comprobar las opciones exactas en la documentación del SDK). Así no lee archivos ni ejecuta nada.
- Es más lento que una llamada directa a la API. Aceptable para este caso, porque el resumen se genera tras la reunión.
- El plan Pro tiene límites por sesión que se comparten con el chat y con Claude Code. Para no gastarlos de más: Haiku en los trozos, Sonnet solo en el resultado final, y mostrar un error claro si se alcanza el límite, sin reintentos en bucle.
- Autenticación: `CLAUDE_CODE_OAUTH_TOKEN` en `.env` (en una sola línea) o, si está vacío, el inicio de sesión de Claude Code del propio ordenador. El paso a paso está en el `README`.
- La suscripción Pro es de uso individual. No compartir este acceso con otras personas ni usarlo para dar servicio a terceros; para eso, modo `api`.
- Revisar la ayuda oficial antes de decidir, porque las condiciones han cambiado varias veces: `https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan`

## Pipeline de IA con Claude

### Modelos

| Modelo | Uso |
|---|---|
| `claude-haiku-5-5` | Resumen de cada trozo en reuniones largas (rápido y barato). |
| `claude-sonnet-5-5` | Resumen final, tareas, decisiones y diagrama Mermaid. Modelo principal. |

Costes y límites exactos: consultar `https://docs.claude.com` antes de fijar presupuesto, porque cambian.

### Resumen

- Enviar la transcripción a Claude con un prompt que pida **solo JSON** con estas claves: `resumen`, `decisiones`, `tareas` (con `responsable`), `temas`.
- Validar la respuesta con `zod` y reintentar una vez si no cumple el esquema.
- Reuniones largas: dividir la transcripción en trozos (por ejemplo por tamaño con algo de solape), resumir cada trozo con Haiku y hacer un resumen final con Sonnet a partir de los resúmenes parciales.
- Responder siempre en el idioma de la transcripción (por defecto español).

### Esquema o diagrama

- Pedir a Claude que genere el diagrama como **código Mermaid** (`mindmap`, `flowchart` o `timeline`) a partir del resumen, no de la transcripción completa.
- Devolver solo el código Mermaid, sin texto alrededor ni bloques markdown.
- En el frontend, validar con `mermaid.parse()`. Si falla, reenviar a Claude el código y el mensaje de error para que lo corrija, con un máximo de 2 reintentos. Si sigue fallando, mostrar el resumen sin diagrama y un aviso.
- Render con `mermaid.js`, edición del texto por el usuario y exportación a SVG y PNG.

### Prompts base (ajustar al implementar)

- **Sistema (resumen):** "Eres un asistente que resume reuniones. Recibes una transcripción y devuelves únicamente un JSON válido con las claves resumen, decisiones, tareas y temas. No inventes datos que no estén en la transcripción. Si no hay responsable claro en una tarea, usa null."
- **Sistema (diagrama):** "Recibes el resumen de una reunión y devuelves únicamente código Mermaid válido de tipo mindmap. Sin explicaciones ni bloques de código. Textos cortos, sin caracteres que rompan la sintaxis."

## Aviso legal

Grabar a otras personas en España y la UE exige informarlas y obtener su consentimiento (RGPD). La app debe mostrar un aviso claro al iniciar la grabación. Todo corre en local y el audio no se guarda, pero la transcripción sí se almacena en la base de datos y se envía a la API de Anthropic para generar el resumen. Hay que tenerlo en cuenta con reuniones confidenciales, y por eso conviene poder eliminar reuniones con facilidad.

## Arrancar y comprobar (para Claude Code)

- Primera vez o tras cambiar dependencias: `scripts/setup.sh` (npm en `api` y `web`, `stt/.venv` con `pip`, y `.env` desde `.env.example`).
- Arrancar todo: `scripts/start.sh`, o la configuración `app` de `.claude/launch.json` para verla en el navegador integrado. Compila `api` en cada arranque.
- Comprobar tipos: `npm run typecheck --prefix api` y `npm run typecheck --prefix web`.
- Cambios de esquema: editar `api/src/infrastructure/out/sqlite/schema.ts` y ejecutar `npm run db:generate --prefix api`.
- Docker Desktop puede seguir reteniendo los puertos 3000 y 8000 de la versión anterior aunque su motor no responda; si `api` o `stt` fallan con `EADDRINUSE`, hay que cerrar Docker Desktop.
