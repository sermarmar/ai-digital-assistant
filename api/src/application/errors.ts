export class InvalidModelResponseError extends Error {
  constructor(detail: string) {
    super(`Claude ha devuelto una respuesta con un formato no válido: ${detail}`);
    this.name = 'InvalidModelResponseError';
  }
}
