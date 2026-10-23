import type { MeetingDetail } from '../../domain/meeting';
import { meetingToMarkdown } from '../meeting-markdown';
import type { DiagramRenderer } from '../ports/diagram-renderer';
import type { FileSaver } from '../ports/file-saver';

export type ExportFormat = 'markdown' | 'json' | 'svg' | 'png';

export class ExportMeeting {
  constructor(
    private readonly renderer: DiagramRenderer,
    private readonly fileSaver: FileSaver,
  ) {}

  async execute(meeting: MeetingDetail, format: ExportFormat): Promise<void> {
    const name = fileBaseName(meeting);
    switch (format) {
      case 'markdown':
        return this.fileSaver.save(`${name}.md`, new Blob([meetingToMarkdown(meeting)], { type: 'text/markdown' }));
      case 'json':
        return this.fileSaver.save(
          `${name}.json`,
          new Blob([JSON.stringify(meeting, null, 2)], { type: 'application/json' }),
        );
      case 'svg':
        return this.fileSaver.save(
          `${name}.svg`,
          new Blob([await this.renderer.renderSvg(requireDiagram(meeting))], { type: 'image/svg+xml' }),
        );
      case 'png':
        return this.fileSaver.save(`${name}.png`, await this.renderer.renderPng(requireDiagram(meeting)));
    }
  }
}

function requireDiagram(meeting: MeetingDetail): string {
  if (!meeting.diagram) throw new Error('Esta reunión no tiene diagrama');
  return meeting.diagram.mermaidCode;
}

// "Reunión de presupuesto" del 23/10/2026 → "reunion-de-presupuesto-2026-10-23"
function fileBaseName(meeting: MeetingDetail): string {
  const slug = meeting.title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = meeting.createdAt.toISOString().slice(0, 10);
  return `${slug || 'reunion'}-${date}`;
}
