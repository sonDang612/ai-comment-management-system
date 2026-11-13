import { Injectable } from '@nestjs/common';
import {
  type AiModerationRequest,
  type AiModerationResult,
  CommentStatus,
  DecidedBy,
} from '@acms/shared';
import { ServiceUnavailableException } from '../../common/errors/app.exception.js';
import { AiServiceClient } from './ai-service.client.js';

const MODERATION_PATH = '/v1/moderations';

const COMMENT_STATUSES = new Set<string>(Object.values(CommentStatus));
const DECIDED_BY_VALUES = new Set<string>(Object.values(DecidedBy));

function isAiModerationResult(value: unknown): value is AiModerationResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result['comment_id'] === 'string' &&
    typeof result['decision'] === 'string' &&
    COMMENT_STATUSES.has(result['decision']) &&
    typeof result['decided_by'] === 'string' &&
    DECIDED_BY_VALUES.has(result['decided_by']) &&
    typeof result['confidence'] === 'number' &&
    result['confidence'] >= 0 &&
    result['confidence'] <= 1 &&
    typeof result['reason'] === 'string' &&
    typeof result['model_version'] === 'string' &&
    Array.isArray(result['labels']) &&
    result['labels'].every((label) => typeof label === 'string')
  );
}

@Injectable()
export class AiModerationClient {
  constructor(private readonly aiService: AiServiceClient) {}

  async moderate(request: AiModerationRequest): Promise<AiModerationResult> {
    const result = await this.aiService.request<unknown>(MODERATION_PATH, {
      method: 'POST',
      body: request,
    });
    if (!isAiModerationResult(result) || result.comment_id !== request.comment_id) {
      throw new ServiceUnavailableException('AI service returned an invalid moderation result');
    }
    return result;
  }
}
