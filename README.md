# Asistente de reuniones

Graba desde el navegador el audio de una videollamada (o de cualquier pestaña), lo transcribe con Whisper en tu ordenador y genera con Claude:

- un resumen con decisiones, tareas (con responsable) y temas,
- un esquema en forma de mapa mental, que puedes editar y descargar.

Todo corre en local con Docker. El audio no sale de tu ordenador ni se guarda. La transcripción sí se guarda en la base de datos local y se envía a Claude para generar el resumen.

## Requisitos

- **Docker Desktop** con Docker Compose v2.
- **Chrome o Edge de escritorio** para grabar. Firefox y Safari no permiten capturar el audio que se comparte.
- **Claude**, una de estas dos opciones:
  - Una suscripción Pro o superior y [Claude Code](https://code.claude.com) instalado para generar el token. Es la opción por defecto y no se paga por uso.
  - Una clave de API de Anthropic, que se paga por token.
- Unos **3 GB de disco**: unos 2 GB de imágenes y medio GB del modelo de Whisper.

## Puesta en marcha (primera vez)

1. Crea tu archivo de configuración a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Abre `.env` y cambia `POSTGRES_PASSWORD` por una clave tuya. Evita los caracteres `@ : / #`, porque la clave va dentro de una URL.

3. Genera el token de tu suscripción de Claude:

   ```bash
   claude setup-token
   ```

   Se abre el navegador. Entra con tu cuenta y autoriza. La terminal muestra un token que empieza por `sk-ant-oat01-` y dura un año.

4. Pega el token en `.env`, en la línea `CLAUDE_CODE_OAUTH_TOKEN=`, **en una sola línea**. La terminal suele partirlo en dos, así que únelo sin espacios. En macOS puedes copiarlo entero y ejecutar esto desde la carpeta del proyecto, que quita los saltos de línea y lo escribe por ti:

   ```bash
   TOKEN=$(pbpaste | tr -d '[:space:]'); [[ "$TOKEN" == sk-ant-oat01-* ]] && sed -i '' "s|^CLAUDE_CODE_OAUTH_TOKEN=.*|CLAUDE_CODE_OAUTH_TOKEN=$TOKEN|" .env && echo "Token guardado"; unset TOKEN
   ```

   Deja `ANTHROPIC_API_KEY` vacía.

5. Arranca todo:

   ```bash
   docker compose up -d --build
   ```

   La primera vez tarda varios minutos: se construyen las imágenes y el servicio `stt` descarga el modelo de Whisper. Para ver el progreso:

   ```bash
   docker compose ps
   ```

   Cuando los cuatro servicios estén en marcha (`db`, `stt` y `api` aparecen como *healthy*), sigue al paso 6.

6. Abre **http://localhost:8080** en Chrome o Edge.

A partir de entonces basta con `docker compose up -d` para arrancar y `docker compose down` para parar. Los datos se conservan.

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

La reunión pasa por **Transcribiendo** (Whisper) y **Resumiendo** (Claude) hasta quedar **Lista**. La página se actualiza sola, y puedes cerrarla mientras tanto porque el procesado sigue en el servidor. Cuando termina verás:

- **Resumen**, decisiones, tareas y temas.
- **Esquema**: si Mermaid no puede dibujarlo, la app pide a Claude que lo corrija (hasta dos veces). Con **Editar** puedes cambiar el código y ver el resultado mientras escribes.
- **Transcripción** con marcas de tiempo.
- **Descargas** en Markdown, JSON, SVG y PNG.
- **Eliminar reunión**, que borra la transcripción, el resumen y el diagrama.

## Suscripción o API

| | `subscription` (por defecto) | `api` |
|---|---|---|
| Cómo se paga | Con tu plan de Claude, sin coste por token | Por token, con la clave de API |
| Qué poner en `.env` | `CLAUDE_CODE_OAUTH_TOKEN` | `ANTHROPIC_API_KEY` |
| Límites | Los de tu plan, compartidos con el chat y Claude Code | Los de tu cuenta de API |

Para cambiar de modo, edita `CLAUDE_PROVIDER` en `.env` y reinicia `api`:

```bash
docker compose up -d api
```

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
| `WHISPER_MODEL` | `small`, `medium` o `large-v3`: más grande es más preciso y más lento | `small` |
| `WHISPER_LANGUAGE` | Idioma del audio; si se deja vacío, se detecta solo | `es` |
| `STT_URL` | Dirección del servicio de transcripción | `http://stt:8000` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Base de datos | `reuniones`; la clave la eliges tú |
| `API_PORT` | Puerto de la API en tu ordenador | `3000` |
| `WEB_PORT` | Puerto de la web en tu ordenador | `8080` |

Todos los puertos se publican solo en `127.0.0.1`: no se puede acceder desde otros equipos de la red.

## Arquitectura

```
Navegador ──► web (nginx :8080) ──/api──► api (Node + Fastify) ──► stt (Whisper)
                                              │                └──► Claude
                                              └──► db (PostgreSQL)
```

| Servicio | Tecnología | Función |
|---|---|---|
| `web` | React, TypeScript, Vite, Tailwind, Mermaid; servido con nginx | Grabación, resultados, historial y descargas |
| `api` | Node.js, TypeScript, Fastify, Drizzle, SDK de Claude | Coordina la transcripción y Claude, y guarda las reuniones |
| `stt` | Python, FastAPI, faster-whisper | Convierte el audio en texto, en local |
| `db` | PostgreSQL 18 | Reuniones, transcripciones, resúmenes y esquemas |

Los tres servicios propios siguen arquitectura hexagonal:

- `domain/`: entidades y reglas, sin dependencias.
- `application/`: casos de uso y puertos, que son las interfaces de lo que se necesita del exterior.
- `infrastructure/`: adaptadores que implementan esos puertos (Postgres, Whisper, Claude, HTTP…).
- `main.ts` / `main.py` / `main.tsx`: el único sitio donde se conecta todo.

Las reglas detalladas están en [CLAUDE.md](CLAUDE.md).

## Desarrollo

**Web con recarga en caliente.** Levanta el resto de servicios con Docker y la web con Vite:

```bash
docker compose up -d db stt api
```

```bash
npm install --prefix web
```

```bash
npm run dev --prefix web
```

Se abre en http://localhost:5173 y Vite redirige `/api` a `http://127.0.0.1:3000`.

**Cambios en `api` o `stt`.** Reconstruye solo ese servicio:

```bash
docker compose up -d --build api
```

**Comprobar tipos:**

```bash
npm run typecheck --prefix api
```

```bash
npm run typecheck --prefix web
```

**Cambios en la base de datos.** Edita `api/src/infrastructure/out/postgres/schema.ts` y genera la migración. Se aplica sola al arrancar `api`.

```bash
npm run db:generate --prefix api
```

## Datos y privacidad

- Los datos están en dos volúmenes de Docker: `db-data` (la base de datos) y `stt-models` (el modelo de Whisper). Sobreviven a `docker compose down`.
- **El audio no se guarda**: se descarta después de transcribirlo.
- La **transcripción se envía a Anthropic** para generar el resumen. Tenlo en cuenta con reuniones confidenciales y elimina las que no necesites.
- En España y la UE (RGPD) tienes que informar a las personas que grabas y obtener su consentimiento.
- Para **borrar todos los datos** (reuniones y modelo) de forma irreversible:

  ```bash
  docker compose down -v
  ```

## Comandos útiles

| Para… | Comando |
|---|---|
| Arrancar | `docker compose up -d` |
| Parar | `docker compose down` |
| Ver el estado | `docker compose ps` |
| Ver los logs de un servicio | `docker compose logs -f api` |
| Reconstruir tras cambiar código | `docker compose up -d --build` |

## Problemas frecuentes

**«No se ha compartido audio»**: elegiste una ventana o no marcaste la opción de compartir el audio. Vuelve a grabar eligiendo una pestaña y marcando *Compartir también el audio de la pestaña*.

**No aparece la sección «Grabar»**: el navegador no es compatible. Usa Chrome o Edge de escritorio, o sube un archivo de audio.

**En macOS no se oye a los demás**: macOS no deja compartir el audio del sistema desde el navegador. Graba la **pestaña** de la videollamada (Meet, Teams web, Zoom web) en lugar de la aplicación de escritorio.

**«No se ha podido autenticar con la suscripción de Claude»**: el token falta, está incompleto (tiene que estar en una sola línea) o ha caducado. Genera otro con `claude setup-token`, pégalo en `.env` y reinicia `api` con `docker compose up -d api`.

**«Se ha alcanzado el límite de uso de Claude»**: has gastado el límite de tu plan en este periodo. Espera a que se renueve o cambia al modo `api`.

**La transcripción tarda mucho**: Whisper corre en la CPU. Con el modelo `small` en un Intel Core i7 de 6 núcleos tarda aproximadamente el 70 % de la duración del audio: una reunión de una hora tarda unos 40 minutos. `medium` y `large-v3` son más precisos pero bastante más lentos.

**`stt` no pasa a *healthy* la primera vez**: todavía está descargando el modelo. Espera unos minutos; puedes ver el progreso con `docker compose logs -f stt`.

**El puerto 8080 (o 3000) está ocupado**: cambia `WEB_PORT` (o `API_PORT`) en `.env` y vuelve a ejecutar `docker compose up -d`.
