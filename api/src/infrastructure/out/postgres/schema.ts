import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { DIAGRAM_TYPES } from '../../../domain/diagram.js';
import { MEETING_STATUSES } from '../../../domain/meeting.js';
import type { Task } from '../../../domain/summary.js';
import type { TranscriptSegment } from '../../../domain/transcript.js';

export const meetingStatus = pgEnum('meeting_status', MEETING_STATUSES);
export const diagramType = pgEnum('diagram_type', DIAGRAM_TYPES);

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  durationSeconds: integer('duration_seconds'),
  language: text('language').notNull().default('es'),
  status: meetingStatus('status').notNull().default('transcribiendo'),
});

// Las tres tablas siguientes cuelgan de meetings (una fila por reunión como máximo)
// y se borran solas al borrar la reunión (onDelete: 'cascade').

export const transcripts = pgTable('transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id')
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  segments: jsonb('segments').$type<TranscriptSegment[]>().notNull(),
});

export const summaries = pgTable('summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id')
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  resumen: text('resumen').notNull(),
  decisiones: jsonb('decisiones').$type<string[]>().notNull(),
  tareas: jsonb('tareas').$type<Task[]>().notNull(),
  temas: jsonb('temas').$type<string[]>().notNull(),
  model: text('model').notNull(),
});

export const diagrams = pgTable('diagrams', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id')
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  type: diagramType('type').notNull(),
  mermaidCode: text('mermaid_code').notNull(),
});
