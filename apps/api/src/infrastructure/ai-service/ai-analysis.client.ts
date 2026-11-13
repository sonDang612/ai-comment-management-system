import { Injectable } from '@nestjs/common';
import type { AiCommentAnalysis, AiCommentAnalysisRequest } from '@acms/shared';
import { ServiceUnavailableException } from '../../common/errors/app.exception.js';
import { AiServiceClient } from './ai-service.client.js';

const COMMENT_ANALYSIS_PATH = '/v1/analysis/comments';

function isAiCommentAnalysis(value: unknown): value is AiCommentAnalysis {
  if (typeof value !== 'object' || value === null) return false;
  const analysis = value as Record<string, unknown>;
  return (
    typeof analysis['is_valid'] === 'boolean' &&
    typeof analysis['is_question'] === 'boolean' &&
    typeof analysis['confidence'] === 'number' &&
    analysis['confidence'] >= 0 &&
    analysis['confidence'] <= 1 &&
    typeof analysis['reason'] === 'string'
  );
}

@Injectable()
export class AiAnalysisClient {
  constructor(private readonly aiService: AiServiceClient) {}

  async analyzeComment(request: AiCommentAnalysisRequest): Promise<AiCommentAnalysis> {
    const analysis = await this.aiService.request<unknown>(COMMENT_ANALYSIS_PATH, {
      method: 'POST',
      body: request,
    });
    if (!isAiCommentAnalysis(analysis)) {
      throw new ServiceUnavailableException('AI service returned an invalid comment analysis');
    }
    return analysis;
  }
}
