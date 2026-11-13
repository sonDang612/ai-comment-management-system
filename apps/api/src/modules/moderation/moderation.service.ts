import { Injectable, Logger } from '@nestjs/common';
import type { AiCommentAnalysis, RuleSettings } from '@acms/shared';
import { AiAnalysisClient } from '../../infrastructure/ai-service/ai-analysis.client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { Comment } from '../../generated/prisma/client.js';
import { RuleSettingsService } from '../rule-settings/rule-settings.service.js';
import { RuleChecker, type RuleViolation, RuleViolationCode } from './rules/rule-checker.js';

const MS_PER_MINUTE = 60_000;
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
      const settings = await this.ruleSettings.get();
      violations = [
        ...this.ruleChecker.check(comment.content, settings),
        ...(await this.checkDuplicate(comment, settings)),
      ];
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

  private async checkDuplicate(comment: Comment, settings: RuleSettings): Promise<RuleViolation[]> {
    const { duplicate_detection_enabled, duplicate_window_minutes } = settings.spam;
    if (!duplicate_detection_enabled || comment.content.trim() === '') return [];
    const windowStart = new Date(comment.createdAt.getTime() - duplicate_window_minutes * MS_PER_MINUTE);
    const duplicate = await this.prisma.comment.findFirst({
      where: { id: { not: comment.id }, content: comment.content, createdAt: { gte: windowStart } },
      select: { id: true },
    });
    if (duplicate === null) return [];
    return [
      {
        code: RuleViolationCode.DUPLICATE_CONTENT,
        reason: `${duplicate_window_minutes} 分钟内重复提交了相同内容`,
      },
    ];
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
