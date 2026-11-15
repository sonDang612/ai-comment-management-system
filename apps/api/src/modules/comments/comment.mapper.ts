import {
  COMMENT_CATEGORIES,
  DECISION_SOURCES,
  MODERATION_LABELS,
  type CommentCategory,
  type CommentDto,
  type CommentModelOutput,
  type CommentReview,
  type DecisionSource,
  type ModerationLabel,
} from '@acms/shared';
import type { Comment } from '../../generated/prisma/client.js';
import { describeModelOutput, isOutputScoreList } from '../moderation/analysis/moderation-labels.js';

function toCategory(value: string | null): CommentCategory | null {
  return (COMMENT_CATEGORIES as readonly string[]).includes(value ?? '') ? (value as CommentCategory) : null;
}

function isOneOf<T extends string>(values: readonly T[], value: string | null): value is T {
  return value !== null && (values as readonly string[]).includes(value);
}

function toDecisionSource(value: string | null): DecisionSource | null {
  return isOneOf(DECISION_SOURCES, value) ? value : null;
}

function toReview(comment: Comment): CommentReview | null {
  const label: string | null = comment.reviewedLabel;
  const category: string | null = comment.reviewedCategory;
  if (!comment.reviewedAt || !isOneOf<ModerationLabel>(MODERATION_LABELS, label)) return null;
  if (!isOneOf<CommentCategory>(COMMENT_CATEGORIES, category)) return null;
  return { label, category, reviewed_at: comment.reviewedAt.toISOString() };
}

function toModelOutput(aiScores: unknown): CommentModelOutput | null {
  return isOutputScoreList(aiScores) && aiScores.length > 0 ? describeModelOutput(aiScores) : null;
}

export function toCommentDto(comment: Comment): CommentDto {
  return {
    id: comment.id,
    content: comment.content,
    category: toCategory(comment.category),
    reason: comment.reason,
    model_output: toModelOutput(comment.aiScores),
    decided_by: toDecisionSource(comment.decidedBy),
    review: toReview(comment),
    moderated_at: comment.moderatedAt?.toISOString() ?? null,
    created_at: comment.createdAt.toISOString(),
    updated_at: comment.updatedAt.toISOString(),
  };
}
