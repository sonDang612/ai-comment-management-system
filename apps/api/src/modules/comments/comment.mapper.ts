import { COMMENT_CATEGORIES, type CommentCategory, type CommentDto, type CommentModelOutput } from '@acms/shared';
import type { Comment } from '../../generated/prisma/client.js';
import { describeModelOutput, isOutputScoreList } from '../moderation/analysis/moderation-labels.js';

function toCategory(value: string | null): CommentCategory | null {
  return (COMMENT_CATEGORIES as readonly string[]).includes(value ?? '') ? (value as CommentCategory) : null;
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
    moderated_at: comment.moderatedAt?.toISOString() ?? null,
    created_at: comment.createdAt.toISOString(),
    updated_at: comment.updatedAt.toISOString(),
  };
}
