import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AiCommentAnalysis,
  CommentStatus,
  DecidedBy,
  KeywordAction,
  QUESTION_LABEL,
  type RestrictedKeyword,
} from '@acms/shared';
import type { Env } from '../../config/env.js';
import { type RuleViolation, RuleViolationCode } from './rules/rule-checker.js';

export const QUESTION_CATEGORY = 'question';
export const RULE_VIOLATION_CATEGORY = 'rule_violation';
const VIOLATION_TYPE_SEPARATOR = ',';

export interface ModerationThresholds {
  autoApprove: number;
  autoDisable: number;
}

export interface ModerationOutcome {
  status: CommentStatus;
  category: string | null;
  violationType: string | null;
  labels: string[];
  decidedBy: DecidedBy;
}

@Injectable()
export class ModerationPolicy {
  private readonly defaultThresholds: ModerationThresholds;

  constructor(config: ConfigService<Env, true>) {
    this.defaultThresholds = {
      autoApprove: config.get('MODERATION_AUTO_APPROVE_THRESHOLD', { infer: true }),
      autoDisable: config.get('MODERATION_AUTO_DISABLE_THRESHOLD', { infer: true }),
    };
  }

  decide(
    analysis: AiCommentAnalysis,
    thresholds: ModerationThresholds = this.defaultThresholds,
  ): ModerationOutcome {
    if (!analysis.is_valid) {
      const isConfidentViolation = analysis.confidence >= thresholds.autoDisable;
      return this.aiOutcome(isConfidentViolation ? CommentStatus.DISABLED : CommentStatus.PENDING);
    }
    if (analysis.is_question) {
      return {
        status: CommentStatus.PENDING,
        category: QUESTION_CATEGORY,
        violationType: null,
        labels: [QUESTION_LABEL],
        decidedBy: DecidedBy.AI_MODEL,
      };
    }
    const isConfidentlyValid = analysis.confidence >= thresholds.autoApprove;
    return this.aiOutcome(isConfidentlyValid ? CommentStatus.APPROVED : CommentStatus.PENDING);
  }

  decideRuleViolations(violations: RuleViolation[], keywords: RestrictedKeyword[]): ModerationOutcome {
    const keywordActions = new Map(keywords.map((keyword) => [keyword.id, keyword.action]));
    const isRejected = violations.some(
      (violation) =>
        violation.code !== RuleViolationCode.RESTRICTED_KEYWORD ||
        (violation.keywordId !== undefined && keywordActions.get(violation.keywordId) === KeywordAction.DISABLED),
    );
    return {
      status: isRejected ? CommentStatus.DISABLED : CommentStatus.PENDING,
      category: RULE_VIOLATION_CATEGORY,
      violationType: [...new Set(violations.map((violation) => violation.code))].join(VIOLATION_TYPE_SEPARATOR),
      labels: [],
      decidedBy: DecidedBy.RULE_FILTER,
    };
  }

  private aiOutcome(status: CommentStatus): ModerationOutcome {
    return { status, category: null, violationType: null, labels: [], decidedBy: DecidedBy.AI_MODEL };
  }
}
