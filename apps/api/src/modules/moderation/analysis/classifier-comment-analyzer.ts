import { Logger } from '@nestjs/common';
import type { AiCommentAnalysis, AiCommentAnalysisRequest } from '@acms/shared';
import { ServiceUnavailableException } from '../../../common/errors/app.exception.js';
import type { TeiClient } from '../../../infrastructure/tei/tei.client.js';
import type { CommentAnalyzer } from './comment-analyzer.js';
import { hasExactlyModerationLabels, MAX_INPUT_CHARS, toCommentAnalysis, topPrediction } from './moderation-labels.js';

export class ClassifierCommentAnalyzer implements CommentAnalyzer {
  readonly name = 'classifier';
  private readonly logger = new Logger(ClassifierCommentAnalyzer.name);

  constructor(private readonly tei: TeiClient) {}

  async analyze(request: AiCommentAnalysisRequest): Promise<AiCommentAnalysis> {
    const input = Array.from(request.content).slice(0, MAX_INPUT_CHARS).join('');
    const prediction = topPrediction(await this.tei.predict(input));
    if (!prediction) {
      this.logger.warn(`Invalid classifier scores for comment ${request.comment_id}`);
      throw new ServiceUnavailableException('AI model returned invalid label scores');
    }
    return toCommentAnalysis(prediction);
  }

  async health(timeoutMs: number): Promise<Record<string, unknown>> {
    const info = await this.tei.classifierInfo(timeoutMs);
    if (!hasExactlyModerationLabels(info.labels)) {
      throw new Error(`Model ${info.modelId} does not serve the moderation labels`);
    }
    return { analyzer: this.name, model: info.modelId, labels: info.labels };
  }
}
