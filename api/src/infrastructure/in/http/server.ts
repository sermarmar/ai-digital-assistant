import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { CheckHealthUseCase } from '../../../application/ports/in/check-health.js';
import type { DeleteMeetingUseCase } from '../../../application/ports/in/delete-meeting.js';
import type { GetMeetingUseCase } from '../../../application/ports/in/get-meeting.js';
import type { ListMeetingsUseCase } from '../../../application/ports/in/list-meetings.js';
import { MeetingNotFoundError } from '../../../domain/errors.js';
import { registerHealthRoutes } from './health-routes.js';
import { registerMeetingRoutes } from './meeting-routes.js';

export interface HttpUseCases {
  checkHealth: CheckHealthUseCase;
  listMeetings: ListMeetingsUseCase;
  getMeeting: GetMeetingUseCase;
  deleteMeeting: DeleteMeetingUseCase;
}

export function buildHttpServer(useCases: HttpUseCases): FastifyInstance {
  const app = Fastify({ logger: true });

  // Traduce los errores de dominio y de validación a códigos HTTP
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof MeetingNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'Petición no válida', detalles: error.issues });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'Error interno del servidor' });
  });

  registerHealthRoutes(app, useCases.checkHealth);
  registerMeetingRoutes(app, useCases);

  return app;
}
