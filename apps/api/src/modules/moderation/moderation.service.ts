import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiCommentAnalysis, ModelOutputScore } from '@acms/shared';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { type Comment, Prisma } from '../../generated/prisma/client.js';
import { RuleSettingsService } from '../rule-settings/rule-settings.service.js';
import { COMMENT_ANALYZER, type CommentAnalyzer } from './analysis/comment-analyzer.js';
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
    category: null,
    confidence: RULE_MATCH_CONFIDENCE,
    reason: violations.map((violation) => violation.reason).join(REASON_SEPARATOR),
  };
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly confidenceThreshold: number;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    @Inject(COMMENT_ANALYZER) private readonly analyzer: CommentAnalyzer,
    private readonly ruleChecker: RuleChecker,
    private readonly ruleSettings: RuleSettingsService,
  ) {
    this.confidenceThreshold = config.get('AI_CONFIDENCE_THRESHOLD', { infer: true });
  }

  async moderate(comment: Comment): Promise<Comment> {
    let violations: RuleViolation[];
    try {
      violations = this.ruleChecker.check(comment.content, await this.ruleSettings.get());
    } catch (error) {
      this.logger.warn(`Rule check failed for comment ${comment.id}, it stays unchecked: ${errorMessage(error)}`);
      return comment;
    }

    if (violations.length > 0) return this.saveResult(comment, ruleViolationResult(violations), null);

    try {
      const { analysis, scores } = await this.analyzer.analyze({ comment_id: comment.id, content: comment.content });
      if (!this.isConfident(analysis)) {
        this.logger.log(
          `AI confidence ${analysis.confidence.toFixed(2)} is below ${this.confidenceThreshold} for comment ${comment.id}, it stays unchecked`,
        );
        return this.saveScores(comment, scores);
      }
      return this.saveResult(comment, analysis, scores);
    } catch (error) {
      this.logger.warn(`Analysis failed for comment ${comment.id}, it stays unchecked: ${errorMessage(error)}`);
      return comment;
    }
  }

  private isConfident(analysis: AiCommentAnalysis): boolean {
    return analysis.is_question || analysis.confidence >= this.confidenceThreshold;
  }

  private toScoresColumn(scores: ModelOutputScore[] | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
    return scores === null ? Prisma.DbNull : scores.map(({ label, score }) => ({ label, score }));
  }

  private saveScores(comment: Comment, scores: ModelOutputScore[] | null): Promise<Comment> {
    if (scores === null) return Promise.resolve(comment);
    return this.prisma.comment.update({ where: { id: comment.id }, data: { aiScores: this.toScoresColumn(scores) } });
  }

  private saveResult(comment: Comment, result: AiCommentAnalysis, scores: ModelOutputScore[] | null): Promise<Comment> {
    return this.prisma.comment.update({
      where: { id: comment.id },
      data: {
        category: result.category,
        reason: result.reason,
        aiScores: this.toScoresColumn(scores),
        moderatedAt: new Date(),
      },
    });
  }
}
