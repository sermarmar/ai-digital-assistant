import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { DIAGRAM_TYPES } from '../../../domain/diagram.js';
import { MEETING_STATUSES } from '../../../domain/meeting.js';
import type { Task } from '../../../domain/summary.js';
import type { TranscriptSegment } from '../../../domain/transcript.js';

// SQLite no tiene tipos para uuid, fechas ni JSON: los ids son UUID guardados como texto,
// las fechas se guardan en milisegundos y el JSON como texto (Drizzle hace la conversión).

export const meetings = sqliteTable('meetings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  durationSeconds: integer('duration_seconds'),
  language: text('language').notNull().default('es'),
  status: text('status', { enum: MEETING_STATUSES }).notNull().default('transcribiendo'),
  errorMessage: text('error_message'),
});

// Las tres tablas siguientes cuelgan de meetings (una fila por reunión como máximo)
// y se borran solas al borrar la reunión (onDelete: 'cascade').

export const transcripts = sqliteTable('transcripts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  meetingId: text('meeting_id')
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  segments: text('segments', { mode: 'json' }).$type<TranscriptSegment[]>().notNull(),
});

export const summaries = sqliteTable('summaries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  meetingId: text('meeting_id')
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  resumen: text('resumen').notNull(),
  decisiones: text('decisiones', { mode: 'json' }).$type<string[]>().notNull(),
  tareas: text('tareas', { mode: 'json' }).$type<Task[]>().notNull(),
  temas: text('temas', { mode: 'json' }).$type<string[]>().notNull(),
  model: text('model').notNull(),
});

export const diagrams = sqliteTable('diagrams', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  meetingId: text('meeting_id')
    .notNull()
    .unique()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  type: text('type', { enum: DIAGRAM_TYPES }).notNull(),
  mermaidCode: text('mermaid_code').notNull(),
});
