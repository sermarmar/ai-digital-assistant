export interface DeleteMeetingUseCase {
  /** Borra la reunión y, en cascada, todo lo asociado. Lanza MeetingNotFoundError si no existe. */
  execute(meetingId: string): Promise<void>;
}
