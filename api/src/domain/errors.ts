export class MeetingNotFoundError extends Error {
  constructor(public readonly meetingId: string) {
    super(`No existe la reunión ${meetingId}`);
    this.name = 'MeetingNotFoundError';
  }
}
