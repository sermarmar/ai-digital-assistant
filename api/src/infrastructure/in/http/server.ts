import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { InvalidModelResponseError } from '../../../application/errors.js';
import type { CheckHealthUseCase } from '../../../application/ports/in/check-health.js';
import type { DeleteMeetingUseCase } from '../../../application/ports/in/delete-meeting.js';
import type { FixDiagramUseCase } from '../../../application/ports/in/fix-diagram.js';
import type { GetMeetingUseCase } from '../../../application/ports/in/get-meeting.js';
import type { ListMeetingsUseCase } from '../../../application/ports/in/list-meetings.js';
import type { ProcessMeetingUseCase } from '../../../application/ports/in/process-meeting.js';
import type { UpdateDiagramUseCase } from '../../../application/ports/in/update-diagram.js';
import { TextGenerationError, UsageLimitError } from '../../../application/ports/out/text-generator.js';
import { EmptyAudioError, MeetingNotFoundError } from '../../../domain/errors.js';
import { registerHealthRoutes } from './health-routes.js';
import { registerMeetingRoutes } from './meeting-routes.js';

// Da para vídeos de reuniones largas. La web comprueba el mismo límite antes de subir (upload-meeting.ts)
const MAX_AUDIO_GB = 4;
const MAX_AUDIO_BYTES = MAX_AUDIO_GB * 1024 ** 3;

export interface HttpUseCases {
  checkHealth: CheckHealthUseCase;
  listMeetings: ListMeetingsUseCase;
  getMeeting: GetMeetingUseCase;
  deleteMeeting: DeleteMeetingUseCase;
  processMeeting: ProcessMeetingUseCase;
  fixDiagram: FixDiagramUseCase;
  updateDiagram: UpdateDiagramUseCase;
}

export function buildHttpServer(useCases: HttpUseCases): FastifyInstance {
  const app = Fastify({ logger: true });
  app.register(multipart, { limits: { fileSize: MAX_AUDIO_BYTES, files: 1 } });

  // Traduce los errores de dominio, de aplicación y de validación a códigos HTTP
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof MeetingNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'Petición no válida', detalles: error.issues });
    }
    if (error instanceof EmptyAudioError) {
      return reply.status(400).send({ error: error.message });
    }
    if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
      return reply.status(413).send({ error: `El archivo pesa más de ${MAX_AUDIO_GB} GB, que es el máximo.` });
    }
    if (error instanceof UsageLimitError) {
      return reply.status(429).send({ error: error.message });
    }
    if (error instanceof TextGenerationError || error instanceof InvalidModelResponseError) {
      return reply.status(502).send({ error: error.message });
    }
    // Errores propios de Fastify con código 4xx (JSON mal formado, archivo demasiado grande...)
    if (
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode < 500
    ) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'Error interno del servidor' });
  });

  registerHealthRoutes(app, useCases.checkHealth);
  registerMeetingRoutes(app, useCases);

  return app;
}
