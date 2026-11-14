import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST_ID_HEADER, RequestContext } from '../../common/context/request-context.js';
import { ServiceUnavailableException } from '../../common/errors/app.exception.js';
import type { Env } from '../../config/env.js';

const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
const MODELS_PATH = '/v1/models';

export interface VllmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface VllmChatCompletionRequest {
  messages: VllmChatMessage[];
  max_tokens: number;
  temperature: number;
  logprobs: boolean;
  top_logprobs: number;
  response_format: Record<string, unknown>;
  chat_template_kwargs?: Record<string, unknown>;
}

export interface VllmTopLogprob {
  token: string;
  logprob: number;
}

export interface VllmTokenLogprob extends VllmTopLogprob {
  top_logprobs: VllmTopLogprob[];
}

export interface VllmChatChoice {
  content: string;
  finishReason: string | null;
  logprobs: VllmTokenLogprob[] | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTopLogprob(value: unknown): value is VllmTopLogprob {
  return isRecord(value) && typeof value['token'] === 'string' && typeof value['logprob'] === 'number';
}

function arrayField(value: unknown, key: string): unknown[] | null {
  if (!isRecord(value)) return null;
  const field = value[key];
  return Array.isArray(field) ? (field as unknown[]) : null;
}

function parseTokenLogprob(value: unknown): VllmTokenLogprob | null {
  if (!isRecord(value)) return null;
  const token = value['token'];
  const logprob = value['logprob'];
  if (typeof token !== 'string' || typeof logprob !== 'number') return null;
  const alternatives = arrayField(value, 'top_logprobs') ?? [];
  return { token, logprob, top_logprobs: alternatives.filter(isTopLogprob) };
}

function parseTokenLogprobs(value: unknown): VllmTokenLogprob[] | null {
  const content = arrayField(value, 'content');
  if (!content) return null;
  const entries: VllmTokenLogprob[] = [];
  for (const item of content) {
    const entry = parseTokenLogprob(item);
    if (!entry) return null;
    entries.push(entry);
  }
  return entries;
}

function parseFirstChoice(payload: unknown): VllmChatChoice | null {
  const choice = arrayField(payload, 'choices')?.[0];
  if (!isRecord(choice)) return null;
  const message = choice['message'];
  if (!isRecord(message)) return null;
  const content = message['content'];
  if (typeof content !== 'string') return null;
  const finishReason = choice['finish_reason'];
  return {
    content,
    finishReason: typeof finishReason === 'string' ? finishReason : null,
    logprobs: parseTokenLogprobs(choice['logprobs']),
  };
}

function parseModelIds(payload: unknown): string[] | null {
  const models = arrayField(payload, 'data');
  if (!models) return null;
  return models.flatMap((model) => {
    const id = isRecord(model) ? model['id'] : undefined;
    return typeof id === 'string' ? [id] : [];
  });
}

@Injectable()
export class VllmClient {
  private readonly logger = new Logger(VllmClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  readonly model: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config
      .get('VLLM_URL', { infer: true })
      .replace(/\/+$/, '')
      .replace(/\/v1$/, '');
    this.apiKey = config.get('VLLM_API_KEY', { infer: true });
    this.timeoutMs = config.get('VLLM_TIMEOUT_MS', { infer: true });
    this.model = config.get('VLLM_MODEL', { infer: true });
  }

  async chatCompletion(request: VllmChatCompletionRequest): Promise<VllmChatChoice> {
    const payload = await this.send('POST', CHAT_COMPLETIONS_PATH, { model: this.model, ...request }, this.timeoutMs);
    const choice = parseFirstChoice(payload);
    if (!choice) {
      this.logger.warn('vLLM returned a chat completion without a message');
      throw new ServiceUnavailableException('AI model returned an invalid response');
    }
    return choice;
  }

  async listModelIds(timeoutMs: number): Promise<string[]> {
    const ids = parseModelIds(await this.send('GET', MODELS_PATH, undefined, timeoutMs));
    if (!ids) throw new ServiceUnavailableException('AI model returned an invalid model list');
    return ids;
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
      this.logger.warn(`vLLM ${timedOut ? `timed out after ${timeoutMs} ms` : 'unreachable'} (${method} ${path})`);
      throw new ServiceUnavailableException(timedOut ? 'AI model timed out' : 'AI model is unavailable');
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      this.logger.warn(`vLLM error (${method} ${path}): ${response.status} ${response.statusText}`);
      throw new ServiceUnavailableException('AI model request failed');
    }
    return payload;
  }
}
