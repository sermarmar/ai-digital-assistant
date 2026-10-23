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
}

// Una reunión con todo lo que se ha generado a partir de ella.
// Cada parte es null mientras no se haya generado (o si falló).
export interface MeetingDetail extends Meeting {
  transcript: Transcript | null;
  summary: Summary | null;
  diagram: Diagram | null;
}
