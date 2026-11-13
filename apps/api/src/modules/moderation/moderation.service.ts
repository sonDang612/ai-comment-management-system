import { Injectable, Logger } from '@nestjs/common';
import type { RuleSettings } from '@acms/shared';
import { AiAnalysisClient } from '../../infrastructure/ai-service/ai-analysis.client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { Comment } from '../../generated/prisma/client.js';
import { RuleSettingsService } from '../rule-settings/rule-settings.service.js';
import { type ModerationOutcome, ModerationPolicy } from './moderation-policy.js';
import { RuleChecker, type RuleViolation, RuleViolationCode } from './rules/rule-checker.js';

const MS_PER_MINUTE = 60_000;
const RULE_MATCH_CONFIDENCE = 1;
const REASON_SEPARATOR = '；';

interface DecisionInput {
  reason: string;
  confidence: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAnalysis: AiAnalysisClient,
    private readonly policy: ModerationPolicy,
    private readonly ruleChecker: RuleChecker,
    private readonly ruleSettings: RuleSettingsService,
  ) {}

  async moderate(comment: Comment): Promise<Comment> {
    let violations: RuleViolation[];
    let settings: RuleSettings;
    try {
      settings = await this.ruleSettings.get();
      violations = [
        ...this.ruleChecker.check(comment.content, settings),
        ...(await this.checkDuplicate(comment, settings)),
      ];
    } catch (error) {
      this.logger.warn(`Rule check failed for comment ${comment.id}, it stays pending: ${errorMessage(error)}`);
      return comment;
    }

    if (violations.length > 0) {
      return this.applyDecision(
        comment,
        {
          reason: violations.map((violation) => violation.reason).join(REASON_SEPARATOR),
          confidence: RULE_MATCH_CONFIDENCE,
        },
        this.policy.decideRuleViolations(violations, settings.keywords),
      );
    }

    try {
      const analysis = await this.aiAnalysis.analyzeComment({
        comment_id: comment.id,
        content: comment.content,
      });
      return this.applyDecision(comment, analysis, this.policy.decide(analysis));
    } catch (error) {
      this.logger.warn(`Analysis failed for comment ${comment.id}, it stays pending: ${errorMessage(error)}`);
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

  private async applyDecision(
    comment: Comment,
    { reason, confidence }: DecisionInput,
    outcome: ModerationOutcome,
  ): Promise<Comment> {
    const moderatedAt = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: comment.id },
        data: {
          status: outcome.status,
          reason,
          confidence,
          decidedBy: outcome.decidedBy,
          moderatedAt,
        },
      }),
      this.prisma.moderationDecision.create({
        data: {
          commentId: comment.id,
          normalizedContent: comment.content,
          decision: outcome.status,
          category: outcome.category,
          violationType: outcome.violationType,
          labels: outcome.labels,
          confidence,
          reason,
          decidedBy: outcome.decidedBy,
          createdAt: moderatedAt,
        },
      }),
    ]);
    return updated;
  }
}
