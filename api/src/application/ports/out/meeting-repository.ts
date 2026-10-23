import type { Diagram } from '../../../domain/diagram.js';
import type { Meeting, MeetingDetail } from '../../../domain/meeting.js';
import type { Summary } from '../../../domain/summary.js';
import type { Transcript } from '../../../domain/transcript.js';

export type MeetingChanges = Partial<
  Pick<Meeting, 'status' | 'language' | 'durationSeconds' | 'errorMessage'>
>;

export interface MeetingRepository {
  /** Crea la reunión en estado "transcribiendo". */
  create(title: string): Promise<Meeting>;
  update(meetingId: string, changes: MeetingChanges): Promise<void>;
  saveTranscript(meetingId: string, transcript: Transcript): Promise<void>;
  saveSummary(meetingId: string, summary: Summary): Promise<void>;
  /** Guarda el diagrama, sustituyendo el anterior si lo había. */
  saveDiagram(meetingId: string, diagram: Diagram): Promise<void>;
  /** Pasa a "error" las reuniones que seguían a medio procesar. Devuelve cuántas eran. */
  failUnfinished(errorMessage: string): Promise<number>;

  /** Reuniones ordenadas de la más reciente a la más antigua. */
  findAll(): Promise<Meeting[]>;
  findDetailById(meetingId: string): Promise<MeetingDetail | null>;
  /** Devuelve false si no existía. */
  deleteById(meetingId: string): Promise<boolean>;
}
