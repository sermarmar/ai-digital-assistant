import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DeleteMeetingUseCase } from '../../../application/ports/in/delete-meeting.js';
import type { FixDiagramUseCase } from '../../../application/ports/in/fix-diagram.js';
import type { GetMeetingUseCase } from '../../../application/ports/in/get-meeting.js';
import type { ListMeetingsUseCase } from '../../../application/ports/in/list-meetings.js';
import type { ProcessMeetingUseCase } from '../../../application/ports/in/process-meeting.js';
import type { AudioFile } from '../../../domain/audio-file.js';

const meetingParams = z.object({ id: z.uuid() });
const fixDiagramBody = z.object({ mermaidCode: z.string().min(1), error: z.string().min(1) });

export function registerMeetingRoutes(
  app: FastifyInstance,
  useCases: {
    listMeetings: ListMeetingsUseCase;
    getMeeting: GetMeetingUseCase;
    deleteMeeting: DeleteMeetingUseCase;
    processMeeting: ProcessMeetingUseCase;
    fixDiagram: FixDiagramUseCase;
  },
): void {
  app.get('/meetings', async () => useCases.listMeetings.execute());

  // multipart/form-data con el archivo en "audio" y, opcionalmente, "title".
  // Responde 202 con la reunión recién creada; el procesado sigue en segundo plano.
  app.post('/meetings', async (request, reply) => {
    let audio: AudioFile | undefined;
    let title: string | undefined;
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const content = await part.toBuffer();
        if (part.fieldname === 'audio') {
          audio = { content: new Uint8Array(content), filename: part.filename, mimeType: part.mimetype };
        }
      } else if (part.fieldname === 'title') {
        title = String(part.value);
      }
    }
    if (!audio || audio.content.length === 0) {
      return reply.status(400).send({ error: 'Falta el archivo de audio (campo "audio").' });
    }

    const meeting = await useCases.processMeeting.execute({ title, audio });
    return reply.status(202).send(meeting);
  });

  app.get('/meetings/:id', async (request) => {
    const { id } = meetingParams.parse(request.params);
    return useCases.getMeeting.execute(id);
  });

  app.delete('/meetings/:id', async (request, reply) => {
    const { id } = meetingParams.parse(request.params);
    await useCases.deleteMeeting.execute(id);
    return reply.status(204).send();
  });

  // La web lo llama cuando mermaid.parse() falla, con el código y el mensaje de error
  app.post('/meetings/:id/diagram/fix', async (request) => {
    const { id } = meetingParams.parse(request.params);
    const { mermaidCode, error } = fixDiagramBody.parse(request.body);
    return useCases.fixDiagram.execute(id, mermaidCode, error);
  });
}
