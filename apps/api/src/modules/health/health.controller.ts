import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { HealthResponse } from '@acms/shared';
import type { Response } from 'express';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Readiness: database, Redis, AI service and worker. 503 when any is down. */
  @Get()
  async readiness(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const result = await this.health.check();
    if (result.status !== 'ok') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }

  /** Liveness: the process is up and serving HTTP. */
  @Get('live')
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
