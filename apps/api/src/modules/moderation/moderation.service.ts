import { Injectable, Logger } from '@nestjs/common';
import type { AiCommentAnalysis } from '@acms/shared';
import { AiAnalysisClient } from '../../infrastructure/ai-service/ai-analysis.client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { Comment } from '../../generated/prisma/client.js';
import { RuleSettingsService } from '../rule-settings/rule-settings.service.js';
import { RuleChecker, type RuleViolation } from './rules/rule-checker.js';

const RULE_MATCH_CONFIDENCE = 1;
const REASON_SEPARATOR = '；';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ruleViolationResult(violations: RuleViolation[]): AiCommentAnalysis {
  return {
    is_valid: false,
    is_question: false,
    confidence: RULE_MATCH_CONFIDENCE,
    reason: violations.map((violation) => violation.reason).join(REASON_SEPARATOR),
  };
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAnalysis: AiAnalysisClient,
    private readonly ruleChecker: RuleChecker,
    private readonly ruleSettings: RuleSettingsService,
  ) {}

  async moderate(comment: Comment): Promise<Comment> {
    let violations: RuleViolation[];
    try {
      violations = this.ruleChecker.check(comment.content, await this.ruleSettings.get());
    } catch (error) {
      this.logger.warn(`Rule check failed for comment ${comment.id}, it stays unchecked: ${errorMessage(error)}`);
      return comment;
    }

    if (violations.length > 0) return this.saveResult(comment, ruleViolationResult(violations));

    try {
      const analysis = await this.aiAnalysis.analyzeComment({ comment_id: comment.id, content: comment.content });
      return this.saveResult(comment, analysis);
    } catch (error) {
      this.logger.warn(`Analysis failed for comment ${comment.id}, it stays unchecked: ${errorMessage(error)}`);
      return comment;
    }
  }

  private saveResult(comment: Comment, result: AiCommentAnalysis): Promise<Comment> {
    return this.prisma.comment.update({
      where: { id: comment.id },
      data: {
        isValid: result.is_valid,
        isQuestion: result.is_question,
        confidence: result.confidence,
        reason: result.reason,
        moderatedAt: new Date(),
      },
    });
  }
}
