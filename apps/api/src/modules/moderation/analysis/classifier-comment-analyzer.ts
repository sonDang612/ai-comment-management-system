import { Logger } from '@nestjs/common';
import type { AiCommentAnalysisRequest } from '@acms/shared';
import { ServiceUnavailableException } from '../../../common/errors/app.exception.js';
import type { TeiClient } from '../../../infrastructure/tei/tei.client.js';
import type { CommentAnalysisResult, CommentAnalyzer } from './comment-analyzer.js';
import {
  isTwoHeadModel,
  MAX_INPUT_CHARS,
  predictFromLogits,
  servesModerationOutputs,
  toCommentAnalysis,
} from './moderation-labels.js';

export class ClassifierCommentAnalyzer implements CommentAnalyzer {
  readonly name = 'classifier';
  private readonly logger = new Logger(ClassifierCommentAnalyzer.name);

  constructor(private readonly tei: TeiClient) {}

  async analyze(request: AiCommentAnalysisRequest): Promise<CommentAnalysisResult> {
    const input = Array.from(request.content).slice(0, MAX_INPUT_CHARS).join('');
    const scores = await this.tei.predictLogits(input);
    const prediction = predictFromLogits(scores);
    if (!prediction) {
      this.logger.warn(`Invalid classifier scores for comment ${request.comment_id}`);
      throw new ServiceUnavailableException('AI model returned invalid scores');
    }
    return { analysis: toCommentAnalysis(prediction), scores };
  }

  async health(timeoutMs: number): Promise<Record<string, unknown>> {
    const info = await this.tei.classifierInfo(timeoutMs);
    if (!servesModerationOutputs(info.labels)) {
      throw new Error(`Model ${info.modelId} does not serve the moderation outputs`);
    }
    const format = isTwoHeadModel(info.labels) ? 'label+category' : 'legacy';
    return { analyzer: this.name, model: info.modelId, format, labels: info.labels };
  }
}
