export class MeetingNotFoundError extends Error {
  constructor(public readonly meetingId: string) {
    super(`No existe la reunión ${meetingId}`);
    this.name = 'MeetingNotFoundError';
  }
}

export class EmptyAudioError extends Error {
  constructor() {
    super('El archivo de audio está vacío.');
    this.name = 'EmptyAudioError';
  }
}

export class NoSpeechDetectedError extends Error {
  constructor() {
    super('No se ha detectado voz en el audio.');
    this.name = 'NoSpeechDetectedError';
  }
}
