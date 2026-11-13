import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isApiErrorBody, isApiResponse } from '@acms/shared';
import { REQUEST_ID_HEADER, RequestContext } from '../../common/context/request-context.js';
import { ServiceUnavailableException } from '../../common/errors/app.exception.js';
import type { Env } from '../../config/env.js';

export const INTERNAL_TOKEN_HEADER = 'X-Internal-Token';

export interface AiRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
  /** Resolve with the body for these non-2xx statuses (e.g. 503 from /health). */
  acceptStatuses?: number[];
}

/**
 * Internal HTTP client for synchronous calls to the Python AI server (apps/ai, `acms_ai.server`).
 * Adds the service token and request id; maps every transport/upstream failure to
 * `ServiceUnavailableException` so callers never leak upstream details.
 */
@Injectable()
export class AiServiceClient {
  private readonly logger = new Logger(AiServiceClient.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get('AI_SERVICE_URL', { infer: true }).replace(/\/+$/, '');
    this.token = config.get('AI_SERVICE_TOKEN', { infer: true });
    this.timeoutMs = config.get('AI_SERVICE_TIMEOUT_MS', { infer: true });
  }

  async request<T>(path: string, options: AiRequestOptions = {}): Promise<T> {
    const { method = 'GET', body, timeoutMs = this.timeoutMs, acceptStatuses = [] } = options;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      [INTERNAL_TOKEN_HEADER]: this.token,
    };
    const requestId = RequestContext.requestId();
    if (requestId) headers[REQUEST_ID_HEADER] = requestId;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.logger.warn(`AI service unreachable (${method} ${path}): ${String(error)}`);
      throw new ServiceUnavailableException('AI service is unavailable');
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok && !acceptStatuses.includes(response.status)) {
      const upstream = isApiErrorBody(payload) ? payload.error.code : response.statusText;
      this.logger.warn(`AI service error (${method} ${path}): ${response.status} ${upstream}`);
      throw new ServiceUnavailableException('AI service request failed');
    }
    if (!isApiResponse(payload)) {
      this.logger.warn(`AI service returned a body without the response envelope (${method} ${path})`);
      throw new ServiceUnavailableException('AI service returned an invalid response');
    }
    return payload.data as T;
  }
}
