import type { Logger } from '../../../application/ports/out/logger.js';

export class ConsoleLogger implements Logger {
  error(message: string, error: unknown): void {
    console.error(message, error);
  }
}
