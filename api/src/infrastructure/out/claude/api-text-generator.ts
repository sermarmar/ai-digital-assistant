import Anthropic from '@anthropic-ai/sdk';
import {
  TextGenerationError,
  UsageLimitError,
  type TextGenerationRequest,
  type TextGenerator,
} from '../../../application/ports/out/text-generator.js';

// Modo "api": API de Anthropic con ANTHROPIC_API_KEY, de pago por token.
export class ApiTextGenerator implements TextGenerator {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate({ model, system, prompt }: TextGenerationRequest): Promise<string> {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await this.client.beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: 'user', content: prompt }],
        // Si los filtros de seguridad rechazan la petición, la reintenta en el modelo
        // que Anthropic recomienda para ese caso (en Haiku no tiene efecto)
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) throw new UsageLimitError({ cause: error });
      if (error instanceof Anthropic.AuthenticationError) {
        throw new TextGenerationError('La clave de API de Anthropic no es válida.', { cause: error });
      }
      throw error;
    }

    if (response.stop_reason === 'refusal') {
      throw new TextGenerationError('Claude ha rechazado procesar este contenido.');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new TextGenerationError('La respuesta de Claude se ha cortado por ser demasiado larga.');
    }

    return response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('');
  }
}
