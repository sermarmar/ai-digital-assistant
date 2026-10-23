import type { MeetingGateway } from '../application/ports/meeting-gateway';
import type { Diagram, Meeting, MeetingDetail } from '../domain/meeting';

// En desarrollo, Vite redirige /api al servicio api (ver vite.config.ts)
const API_BASE = '/api';

// En JSON las fechas llegan como texto
type MeetingJson = Omit<Meeting, 'createdAt'> & { createdAt: string };
type MeetingDetailJson = Omit<MeetingDetail, 'createdAt'> & { createdAt: string };

export class HttpMeetingGateway implements MeetingGateway {
  async list(): Promise<Meeting[]> {
    const meetings = await request<MeetingJson[]>('/meetings');
    return meetings.map(withDate);
  }

  async get(meetingId: string): Promise<MeetingDetail> {
    return withDate(await request<MeetingDetailJson>(`/meetings/${meetingId}`));
  }

  async upload(title: string, audio: Blob, filename: string): Promise<Meeting> {
    const form = new FormData();
    form.append('title', title);
    form.append('audio', audio, filename);
    return withDate(await request<MeetingJson>('/meetings', { method: 'POST', body: form }));
  }

  async delete(meetingId: string): Promise<void> {
    await request<void>(`/meetings/${meetingId}`, { method: 'DELETE' });
  }

  fixDiagram(meetingId: string, mermaidCode: string, parseError: string): Promise<Diagram> {
    return request<Diagram>(`/meetings/${meetingId}/diagram/fix`, jsonBody('POST', { mermaidCode, error: parseError }));
  }

  saveDiagram(meetingId: string, mermaidCode: string): Promise<Diagram> {
    return request<Diagram>(`/meetings/${meetingId}/diagram`, jsonBody('PUT', { mermaidCode }));
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new Error('No se ha podido conectar con el servidor.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `El servidor ha respondido con el error ${response.status}.`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function withDate<T extends { createdAt: string }>(json: T): Omit<T, 'createdAt'> & { createdAt: Date } {
  return { ...json, createdAt: new Date(json.createdAt) };
}
