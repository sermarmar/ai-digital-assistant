export class MeetingNotFoundError extends Error {
  constructor(public readonly meetingId: string) {
    super(`No existe la reunión ${meetingId}`);
    this.name = 'MeetingNotFoundError';
  }
}

export class NoSpeechDetectedError extends Error {
  constructor() {
    super('No se ha detectado voz en el audio.');
    this.name = 'NoSpeechDetectedError';
  }
}
