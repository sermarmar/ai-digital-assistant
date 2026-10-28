import type { MultipartFile } from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DeleteMeetingUseCase } from '../../../application/ports/in/delete-meeting.js';
import type { FixDiagramUseCase } from '../../../application/ports/in/fix-diagram.js';
import type { GetMeetingUseCase } from '../../../application/ports/in/get-meeting.js';
import type { ListMeetingsUseCase } from '../../../application/ports/in/list-meetings.js';
import type { ProcessMeetingUseCase } from '../../../application/ports/in/process-meeting.js';
import type { UpdateDiagramUseCase } from '../../../application/ports/in/update-diagram.js';
import type { Meeting } from '../../../domain/meeting.js';

const meetingParams = z.object({ id: z.uuid() });
const fixDiagramBody = z.object({ mermaidCode: z.string().min(1), error: z.string().min(1) });
const updateDiagramBody = z.object({ mermaidCode: z.string().min(1) });

export function registerMeetingRoutes(
  app: FastifyInstance,
  useCases: {
    listMeetings: ListMeetingsUseCase;
    getMeeting: GetMeetingUseCase;
    deleteMeeting: DeleteMeetingUseCase;
    processMeeting: ProcessMeetingUseCase;
    fixDiagram: FixDiagramUseCase;
    updateDiagram: UpdateDiagramUseCase;
  },
): void {
  app.get('/meetings', async () => useCases.listMeetings.execute());

  // multipart/form-data con "title" (opcional) y el archivo de audio o vídeo en "audio".
  // El archivo se va guardando según llega, sin cargarlo en memoria, así que "title"
  // tiene que ir antes que "audio" en el formulario.
  // Responde 202 con la reunión recién creada; el procesado sigue en segundo plano.
  app.post('/meetings', async (request, reply) => {
    let title: string | undefined;
    let meeting: Meeting | undefined;
    for await (const part of request.parts()) {
      if (part.type === 'field') {
        if (part.fieldname === 'title') title = String(part.value);
      } else if (part.fieldname === 'audio') {
        meeting = await useCases.processMeeting.execute({
          title,
          audio: { stream: wholeFile(part, app), filename: part.filename, mimeType: part.mimetype },
        });
      } else {
        part.file.resume();
      }
    }
    if (!meeting) {
      return reply.status(400).send({ error: 'Falta el archivo de audio (campo "audio").' });
    }
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

  app.put('/meetings/:id/diagram', async (request) => {
    const { id } = meetingParams.parse(request.params);
    const { mermaidCode } = updateDiagramBody.parse(request.body);
    return useCases.updateDiagram.execute(id, mermaidCode);
  });
}

// Al pasar del límite de tamaño, busboy corta el archivo sin dar error en el stream.
// Este error hace que se descarte en vez de procesar un audio a medias.
async function* wholeFile(part: MultipartFile, app: FastifyInstance): AsyncIterable<Uint8Array> {
  yield* part.file;
  if (part.file.truncated) throw new app.multipartErrors.RequestFileTooLargeError();
}
