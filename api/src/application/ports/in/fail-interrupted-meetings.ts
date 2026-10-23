export interface FailInterruptedMeetingsUseCase {
  /** Devuelve cuántas reuniones se han marcado como fallidas. */
  execute(): Promise<number>;
}
