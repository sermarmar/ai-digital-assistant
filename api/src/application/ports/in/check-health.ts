export interface HealthStatus {
  ok: boolean;
  database: 'ok' | 'error';
}

export interface CheckHealthUseCase {
  execute(): Promise<HealthStatus>;
}
