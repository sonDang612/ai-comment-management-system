import { Injectable, Logger } from '@nestjs/common';
import type { AiModerationResult } from '@acms/shared';
import { AiModerationClient } from '../../infrastructure/ai-service/ai-moderation.client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { Comment } from '../../generated/prisma/client.js';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiModeration: AiModerationClient,
  ) {}

  async moderate(comment: Comment): Promise<Comment> {
    let result: AiModerationResult;
    try {
      result = await this.aiModeration.moderate({ comment_id: comment.id, content: comment.content });
    } catch (error) {
      this.logger.warn(
        `Moderation failed for comment ${comment.id}, it stays pending: ${error instanceof Error ? error.message : String(error)}`,
      );
      return comment;
    }
    return this.applyDecision(comment, result);
  }

  private async applyDecision(comment: Comment, result: AiModerationResult): Promise<Comment> {
    const moderatedAt = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: comment.id },
        data: {
          status: result.decision,
          reason: result.reason,
          confidence: result.confidence,
          decidedBy: result.decided_by,
          moderatedAt,
        },
      }),
      this.prisma.moderationDecision.create({
        data: {
          commentId: comment.id,
          normalizedContent: comment.content,
          decision: result.decision,
          category: result.category,
          violationType: result.violation_type,
          labels: result.labels,
          confidence: result.confidence,
          reason: result.reason,
          decidedBy: result.decided_by,
          modelVersion: result.model_version,
          createdAt: moderatedAt,
        },
      }),
    ]);
    return updated;
  }
}
