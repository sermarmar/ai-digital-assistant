import type { Diagram, Meeting, MeetingDetail } from '../../domain/meeting';

// Acceso a las reuniones guardadas en el servicio api
export interface MeetingGateway {
  list(): Promise<Meeting[]>;
  get(meetingId: string): Promise<MeetingDetail>;
  upload(title: string, audio: Blob, filename: string): Promise<Meeting>;
  delete(meetingId: string): Promise<void>;
  fixDiagram(meetingId: string, mermaidCode: string, parseError: string): Promise<Diagram>;
  saveDiagram(meetingId: string, mermaidCode: string): Promise<Diagram>;
}
