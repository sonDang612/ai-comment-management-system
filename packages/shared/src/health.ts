export type HealthStatus = 'ok' | 'degraded';
export type ComponentStatus = 'ok' | 'error';

export interface ComponentHealth {
  status: ComponentStatus;
  latency_ms: number | null;
  error?: string | null;
  /** Extra, check-specific information (e.g. number of connected workers). */
  details?: Record<string, unknown>;
}

/**
 * Response of `GET /api/v1/health` (NestJS) and `GET /health` (AI service).
 * The NestJS response aggregates: database, redis, ai_service, worker.
 */
export interface HealthResponse {
  status: HealthStatus;
  service: string;
  version: string;
  environment: string;
  checks: Record<string, ComponentHealth>;
}
