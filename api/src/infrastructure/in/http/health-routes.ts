import type { FastifyInstance } from 'fastify';
import type { CheckHealthUseCase } from '../../../application/ports/in/check-health.js';

export function registerHealthRoutes(app: FastifyInstance, checkHealth: CheckHealthUseCase): void {
  app.get('/health', async (_request, reply) => {
    const health = await checkHealth.execute();
    return reply.status(health.ok ? 200 : 503).send(health);
  });
}
