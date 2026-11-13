import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AiCommentAnalysis, CommentStatus, QUESTION_LABEL } from '@acms/shared';
import type { Env } from '../../config/env.js';

export const QUESTION_CATEGORY = 'question';

export interface ModerationThresholds {
  autoApprove: number;
  autoDisable: number;
}

export interface ModerationOutcome {
  status: CommentStatus;
  category: string | null;
  labels: string[];
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
      return {
        status: isConfidentViolation ? CommentStatus.DISABLED : CommentStatus.PENDING,
        category: null,
        labels: [],
      };
    }
    if (analysis.is_question) {
      return { status: CommentStatus.PENDING, category: QUESTION_CATEGORY, labels: [QUESTION_LABEL] };
    }
    const isConfidentlyValid = analysis.confidence >= thresholds.autoApprove;
    return {
      status: isConfidentlyValid ? CommentStatus.APPROVED : CommentStatus.PENDING,
      category: null,
      labels: [],
    };
  }
}
