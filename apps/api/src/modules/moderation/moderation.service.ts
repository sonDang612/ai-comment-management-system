import { Injectable, Logger } from '@nestjs/common';
import { type AiCommentAnalysis, DecidedBy } from '@acms/shared';
import { AiAnalysisClient } from '../../infrastructure/ai-service/ai-analysis.client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { Comment } from '../../generated/prisma/client.js';
import { type ModerationOutcome, ModerationPolicy } from './moderation-policy.js';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAnalysis: AiAnalysisClient,
    private readonly policy: ModerationPolicy,
  ) {}

  async moderate(comment: Comment): Promise<Comment> {
    let analysis: AiCommentAnalysis;
    try {
      analysis = await this.aiAnalysis.analyzeComment({
        comment_id: comment.id,
        content: comment.content,
      });
    } catch (error) {
      this.logger.warn(
        `Analysis failed for comment ${comment.id}, it stays pending: ${error instanceof Error ? error.message : String(error)}`,
      );
      return comment;
    }
    return this.applyDecision(comment, analysis, this.policy.decide(analysis));
  }

  private async applyDecision(
    comment: Comment,
    analysis: AiCommentAnalysis,
    outcome: ModerationOutcome,
  ): Promise<Comment> {
    const moderatedAt = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: comment.id },
        data: {
          status: outcome.status,
          reason: analysis.reason,
          confidence: analysis.confidence,
          decidedBy: DecidedBy.AI_MODEL,
          moderatedAt,
        },
      }),
      this.prisma.moderationDecision.create({
        data: {
          commentId: comment.id,
          normalizedContent: comment.content,
          decision: outcome.status,
          category: outcome.category,
          violationType: null,
          labels: outcome.labels,
          confidence: analysis.confidence,
          reason: analysis.reason,
          decidedBy: DecidedBy.AI_MODEL,
          modelVersion: analysis.model_version,
          createdAt: moderatedAt,
        },
      }),
    ]);
    return updated;
  }
}
