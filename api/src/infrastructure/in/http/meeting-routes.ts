import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DeleteMeetingUseCase } from '../../../application/ports/in/delete-meeting.js';
import type { GetMeetingUseCase } from '../../../application/ports/in/get-meeting.js';
import type { ListMeetingsUseCase } from '../../../application/ports/in/list-meetings.js';

const meetingParams = z.object({ id: z.uuid() });

export function registerMeetingRoutes(
  app: FastifyInstance,
  useCases: {
    listMeetings: ListMeetingsUseCase;
    getMeeting: GetMeetingUseCase;
    deleteMeeting: DeleteMeetingUseCase;
  },
): void {
  app.get('/meetings', async () => useCases.listMeetings.execute());

  app.get('/meetings/:id', async (request) => {
    const { id } = meetingParams.parse(request.params);
    return useCases.getMeeting.execute(id);
  });

  app.delete('/meetings/:id', async (request, reply) => {
    const { id } = meetingParams.parse(request.params);
    await useCases.deleteMeeting.execute(id);
    return reply.status(204).send();
  });
}
