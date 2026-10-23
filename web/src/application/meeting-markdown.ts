import type { MeetingDetail } from '../domain/meeting';
import { formatClock, formatDate, formatDuration } from './format';

export function meetingToMarkdown(meeting: MeetingDetail): string {
  const lines: string[] = [`# ${meeting.title}`, '', `- Fecha: ${formatDate(meeting.createdAt)}`];
  if (meeting.durationSeconds !== null) lines.push(`- Duración: ${formatDuration(meeting.durationSeconds)}`);

  const { summary, diagram, transcript } = meeting;
  if (summary) {
    lines.push('', '## Resumen', '', summary.resumen);
    lines.push('', '## Decisiones', '', ...listOrEmpty(summary.decisiones));
    lines.push(
      '',
      '## Tareas',
      '',
      ...(summary.tareas.length > 0
        ? summary.tareas.map((t) => `- [ ] ${t.descripcion}${t.responsable ? ` (${t.responsable})` : ''}`)
        : ['_Ninguna_']),
    );
    lines.push('', '## Temas', '', ...listOrEmpty(summary.temas));
  }
  if (diagram) {
    lines.push('', '## Esquema', '', '```mermaid', diagram.mermaidCode, '```');
  }
  if (transcript) {
    lines.push('', '## Transcripción', '');
    lines.push(...transcript.segments.map((s) => `**[${formatClock(s.startSeconds)}]** ${s.text}`));
  }
  return `${lines.join('\n')}\n`;
}

function listOrEmpty(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ['_Ninguna_'];
}
