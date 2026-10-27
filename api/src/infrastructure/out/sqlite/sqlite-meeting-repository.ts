import { desc, eq, inArray } from 'drizzle-orm';
import type {
  MeetingChanges,
  MeetingRepository,
} from '../../../application/ports/out/meeting-repository.js';
import type { Diagram } from '../../../domain/diagram.js';
import type { Meeting, MeetingDetail } from '../../../domain/meeting.js';
import type { Summary } from '../../../domain/summary.js';
import type { Transcript } from '../../../domain/transcript.js';
import type { Database } from './database.js';
import { diagrams, meetings, summaries, transcripts } from './schema.js';

type MeetingRow = typeof meetings.$inferSelect;

export class SqliteMeetingRepository implements MeetingRepository {
  constructor(private readonly db: Database) {}

  async create(title: string): Promise<Meeting> {
    const [row] = await this.db.insert(meetings).values({ title }).returning();
    if (!row) throw new Error('SQLite no ha devuelto la reunión creada');
    return toMeeting(row);
  }

  async update(meetingId: string, changes: MeetingChanges): Promise<void> {
    await this.db.update(meetings).set(changes).where(eq(meetings.id, meetingId));
  }

  async saveTranscript(meetingId: string, transcript: Transcript): Promise<void> {
    await this.db.insert(transcripts).values({ meetingId, ...transcript });
  }

  async saveSummary(meetingId: string, summary: Summary): Promise<void> {
    await this.db.insert(summaries).values({ meetingId, ...summary });
  }

  async saveDiagram(meetingId: string, diagram: Diagram): Promise<void> {
    await this.db
      .insert(diagrams)
      .values({ meetingId, ...diagram })
      .onConflictDoUpdate({ target: diagrams.meetingId, set: diagram });
  }

  async failUnfinished(errorMessage: string): Promise<number> {
    const failed = await this.db
      .update(meetings)
      .set({ status: 'error', errorMessage })
      .where(inArray(meetings.status, ['transcribiendo', 'resumiendo']))
      .returning({ id: meetings.id });
    return failed.length;
  }

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
    errorMessage: row.errorMessage,
  };
}
