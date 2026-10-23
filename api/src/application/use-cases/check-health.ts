import type { CheckHealthUseCase, HealthStatus } from '../ports/in/check-health.js';
import type { DatabaseProbe } from '../ports/out/database-probe.js';

export class CheckHealth implements CheckHealthUseCase {
  constructor(private readonly database: DatabaseProbe) {}

  async execute(): Promise<HealthStatus> {
    const databaseOk = await this.database.isReachable();
    return { ok: databaseOk, database: databaseOk ? 'ok' : 'error' };
  }
}
