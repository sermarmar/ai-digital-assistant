import { desc, eq } from 'drizzle-orm';
import type { MeetingRepository } from '../../../application/ports/out/meeting-repository.js';
import type { Meeting, MeetingDetail } from '../../../domain/meeting.js';
import type { Database } from './database.js';
import { diagrams, meetings, summaries, transcripts } from './schema.js';

type MeetingRow = typeof meetings.$inferSelect;

export class PostgresMeetingRepository implements MeetingRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<Meeting[]> {
    const rows = await this.db.select().from(meetings).orderBy(desc(meetings.createdAt));
    return rows.map(toMeeting);
  }

  async findDetailById(meetingId: string): Promise<MeetingDetail | null> {
    const [row] = await this.db
      .select()
      .from(meetings)
      .leftJoin(transcripts, eq(transcripts.meetingId, meetings.id))
      .leftJoin(summaries, eq(summaries.meetingId, meetings.id))
      .leftJoin(diagrams, eq(diagrams.meetingId, meetings.id))
      .where(eq(meetings.id, meetingId));

    if (!row) return null;

    return {
      ...toMeeting(row.meetings),
      transcript: row.transcripts && {
        text: row.transcripts.text,
        segments: row.transcripts.segments,
      },
      summary: row.summaries && {
        resumen: row.summaries.resumen,
        decisiones: row.summaries.decisiones,
        tareas: row.summaries.tareas,
        temas: row.summaries.temas,
        model: row.summaries.model,
      },
      diagram: row.diagrams && {
        type: row.diagrams.type,
        mermaidCode: row.diagrams.mermaidCode,
      },
    };
  }

  async deleteById(meetingId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(meetings)
      .where(eq(meetings.id, meetingId))
      .returning({ id: meetings.id });
    return deleted.length > 0;
  }
}

function toMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    durationSeconds: row.durationSeconds,
    language: row.language,
    status: row.status,
  };
}
