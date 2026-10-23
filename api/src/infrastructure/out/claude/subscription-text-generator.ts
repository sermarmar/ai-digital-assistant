import { tmpdir } from 'node:os';
import { query, type SDKAssistantMessageError } from '@anthropic-ai/claude-agent-sdk';
import {
  TextGenerationError,
  UsageLimitError,
  type TextGenerationRequest,
  type TextGenerator,
} from '../../../application/ports/out/text-generator.js';

// Variables que recibe el subproceso de Claude Code; el resto del entorno no se le pasa.
// Fuera queda ANTHROPIC_API_KEY (si existiera tendría prioridad y se cobraría por token)
// y también los demás secretos del .env, que Claude Code no necesita.
const SUBPROCESS_ENV_VARS = ['PATH', 'HOME', 'USER', 'TMPDIR', 'LANG', 'CLAUDE_CODE_OAUTH_TOKEN'];

// Modo "subscription": usa la suscripción de Claude (plan Pro) a través del Agent SDK.
// El Agent SDK es Claude Code como librería; aquí se usa como simple generador de texto.
// Se autentica con CLAUDE_CODE_OAUTH_TOKEN o, fuera de Docker, con el login de Claude Code.
export class SubscriptionTextGenerator implements TextGenerator {
  async generate({ model, system, prompt }: TextGenerationRequest): Promise<string> {
    const messages = query({
      prompt,
      options: {
        model,
        systemPrompt: system,
        tools: [], // sin herramientas: no lee archivos ni ejecuta nada
        maxTurns: 1,
        settingSources: [], // no carga CLAUDE.md, skills ni ajustes del usuario
        persistSession: false,
        cwd: tmpdir(),
        env: Object.fromEntries(SUBPROCESS_ENV_VARS.map((name) => [name, process.env[name]])),
      },
    });

    let assistantError: SDKAssistantMessageError | undefined;
    for await (const message of messages) {
      if (message.type === 'assistant' && message.error) {
        assistantError = message.error;
      }
      if (message.type === 'result') {
        if (message.subtype === 'success' && !message.is_error) return message.result;
        throw toTextGenerationError(assistantError, message);
      }
    }
    throw new TextGenerationError('Claude no ha devuelto ninguna respuesta.');
  }
}

function toTextGenerationError(
  assistantError: SDKAssistantMessageError | undefined,
  result: { subtype: string; result?: string; errors?: string[] },
): TextGenerationError {
  if (assistantError === 'rate_limit') return new UsageLimitError();
  if (assistantError === 'authentication_failed') {
    return new TextGenerationError(
      'No se ha podido autenticar con la suscripción de Claude. Revisa CLAUDE_CODE_OAUTH_TOKEN en el .env.',
    );
  }
  const detail = result.result ?? result.errors?.join('; ') ?? result.subtype;
  return new TextGenerationError(`Claude ha devuelto un error: ${detail}`);
}
