export interface TextGenerationRequest {
  model: string;
  system: string;
  prompt: string;
}

export interface TextGenerator {
  generate(request: TextGenerationRequest): Promise<string>;
}

// Los adaptadores traducen sus errores a estos dos, con un mensaje que se puede enseñar al usuario.

export class TextGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TextGenerationError';
  }
}

export class UsageLimitError extends TextGenerationError {
  constructor(options?: ErrorOptions) {
    super('Se ha alcanzado el límite de uso de Claude. Inténtalo de nuevo más tarde.', options);
    this.name = 'UsageLimitError';
  }
}
