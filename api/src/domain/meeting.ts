import type { Diagram } from './diagram.js';
import type { Summary } from './summary.js';
import type { Transcript } from './transcript.js';

export const MEETING_STATUSES = ['transcribiendo', 'resumiendo', 'listo', 'error'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export interface Meeting {
  id: string;
  title: string;
  createdAt: Date;
  durationSeconds: number | null;
  language: string;
  status: MeetingStatus;
  /** Motivo del fallo (estado "error") o aviso si algo no se pudo generar. */
  errorMessage: string | null;
}

// Una reunión con todo lo que se ha generado a partir de ella.
// Cada parte es null mientras no se haya generado (o si falló).
export interface MeetingDetail extends Meeting {
  transcript: Transcript | null;
  summary: Summary | null;
  diagram: Diagram | null;
}

/**
 * Una reunión se puede continuar si se quedó a medias después de transcribir: sin resumen
 * (falló Claude o se reinició el servidor) o sin diagrama. Si falló antes de tener la
 * transcripción no se puede, porque el audio no se guarda: hay que volver a subirlo.
 */
export function canResume(meeting: MeetingDetail): meeting is MeetingDetail & { transcript: Transcript } {
  if (meeting.status === 'transcribiendo' || meeting.status === 'resumiendo') return false;
  return meeting.transcript !== null && (meeting.summary === null || meeting.diagram === null);
}
