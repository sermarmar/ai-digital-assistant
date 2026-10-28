// Mismo modelo que el dominio del servicio api (las claves del resumen van en español)

export type MeetingStatus = 'transcribiendo' | 'resumiendo' | 'listo' | 'error';

export interface Meeting {
  id: string;
  title: string;
  createdAt: Date;
  durationSeconds: number | null;
  language: string;
  status: MeetingStatus;
  errorMessage: string | null;
}

export interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
}

export interface Task {
  descripcion: string;
  responsable: string | null;
}

export interface Summary {
  resumen: string;
  decisiones: string[];
  tareas: Task[];
  temas: string[];
  model: string;
}

export interface Diagram {
  type: 'mindmap' | 'flowchart' | 'timeline';
  mermaidCode: string;
}

export interface MeetingDetail extends Meeting {
  transcript: Transcript | null;
  summary: Summary | null;
  diagram: Diagram | null;
}

export function isProcessing(status: MeetingStatus): status is 'transcribiendo' | 'resumiendo' {
  return status === 'transcribiendo' || status === 'resumiendo';
}

// La misma regla que canResume en el dominio de api: se puede continuar si se quedó a medias
// después de transcribir. Sin transcripción no, porque el audio no se guarda.
export function canResume(meeting: MeetingDetail): boolean {
  if (isProcessing(meeting.status)) return false;
  return meeting.transcript !== null && (meeting.summary === null || meeting.diagram === null);
}
