export interface RecordingSession {
  /** false si no se pudo usar el micrófono y solo se graba el audio compartido. */
  readonly hasMicrophone: boolean;
  /** Para la grabación y devuelve el audio. Se puede llamar varias veces. */
  stop(): Promise<Blob>;
  /** Avisa si el usuario deja de compartir desde la barra del navegador. */
  onInterrupted(listener: () => void): void;
}

export interface AudioCapture {
  /** Solo Chrome y Edge de escritorio dan audio al compartir. */
  isSupported(): boolean;
  start(options: { includeMicrophone: boolean }): Promise<RecordingSession>;
}

export class NoSharedAudioError extends Error {
  constructor() {
    super(
      'No se ha compartido audio. Al elegir qué compartir, escoge una pestaña (o la pantalla completa en Windows) y marca la opción de compartir el audio.',
    );
    this.name = 'NoSharedAudioError';
  }
}

export class CaptureCancelledError extends Error {
  constructor() {
    super('Se ha cancelado la selección de qué compartir.');
    this.name = 'CaptureCancelledError';
  }
}
