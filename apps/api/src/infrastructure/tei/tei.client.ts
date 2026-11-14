import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST_ID_HEADER, RequestContext } from '../../common/context/request-context.js';
import { ServiceUnavailableException } from '../../common/errors/app.exception.js';
import type { Env } from '../../config/env.js';

const PREDICT_PATH = '/predict';
const INFO_PATH = '/info';

export interface TeiLabelScore {
  label: string;
  score: number;
}

export interface TeiClassifierInfo {
  modelId: string;
  labels: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLabelScore(value: unknown): value is TeiLabelScore {
  return isRecord(value) && typeof value['label'] === 'string' && typeof value['score'] === 'number';
}

function parseLabelScores(payload: unknown): TeiLabelScore[] | null {
  if (!Array.isArray(payload)) return null;
  const scores: unknown[] = Array.isArray(payload[0]) ? (payload[0] as unknown[]) : payload;
  return scores.length > 0 && scores.every(isLabelScore) ? scores : null;
}

function parseClassifierInfo(payload: unknown): TeiClassifierInfo | null {
  if (!isRecord(payload)) return null;
  const modelId = payload['model_id'];
  const modelType = payload['model_type'];
  const classifier = isRecord(modelType) ? modelType['classifier'] : undefined;
  const id2label = isRecord(classifier) ? classifier['id2label'] : undefined;
  if (typeof modelId !== 'string' || !isRecord(id2label)) return null;
  const labels = Object.values(id2label);
  if (!labels.every((label): label is string => typeof label === 'string')) return null;
  return { modelId, labels };
}

@Injectable()
export class TeiClient {
  private readonly logger = new Logger(TeiClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get('TEI_URL', { infer: true }).replace(/\/+$/, '');
    this.apiKey = config.get('TEI_API_KEY', { infer: true });
    this.timeoutMs = config.get('TEI_TIMEOUT_MS', { infer: true });
  }

  async predict(text: string): Promise<TeiLabelScore[]> {
    const payload = await this.send('POST', PREDICT_PATH, { inputs: text, truncate: true, raw_scores: false }, this.timeoutMs);
    const scores = parseLabelScores(payload);
    if (!scores) {
      this.logger.warn('TEI returned a prediction without label scores');
      throw new ServiceUnavailableException('AI model returned an invalid response');
    }
    return scores;
  }

  async classifierInfo(timeoutMs: number): Promise<TeiClassifierInfo> {
    const info = parseClassifierInfo(await this.send('GET', INFO_PATH, undefined, timeoutMs));
    if (!info) throw new ServiceUnavailableException('AI model is not a classifier');
    return info;
  }

  private async send(method: 'GET' | 'POST', path: string, body: unknown, timeoutMs: number): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const requestId = RequestContext.requestId();
    if (requestId) headers[REQUEST_ID_HEADER] = requestId;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      this.logger.warn(`TEI ${timedOut ? `timed out after ${timeoutMs} ms` : 'unreachable'} (${method} ${path})`);
      throw new ServiceUnavailableException(timedOut ? 'AI model timed out' : 'AI model is unavailable');
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      this.logger.warn(`TEI error (${method} ${path}): ${response.status} ${response.statusText}`);
      throw new ServiceUnavailableException('AI model request failed');
    }
    return payload;
  }
}
