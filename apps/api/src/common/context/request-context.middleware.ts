import { randomUUID } from 'node:crypto';
import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER, RequestContext } from './request-context.js';

const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;
const QUIET_PATHS = new Set(['/api/v1/health/live']);

/**
 * Assigns a request id (or trusts a well-formed incoming one), exposes it via
 * `RequestContext`, echoes it in the response and writes one access-log line per request.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(REQUEST_ID_HEADER) ?? '';
    const requestId = VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID().replaceAll('-', '');
    const start = process.hrtime.bigint();
    res.setHeader(REQUEST_ID_HEADER, requestId);

    res.on('finish', () => {
      const path = req.originalUrl.split('?')[0] ?? req.originalUrl;
      if (QUIET_PATHS.has(path) && res.statusCode < 400) return;
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      this.logger.log(
        `${req.method} ${path} ${res.statusCode} ${durationMs.toFixed(1)}ms [${requestId}]`,
      );
    });

    RequestContext.run({ requestId }, next);
  }
}
