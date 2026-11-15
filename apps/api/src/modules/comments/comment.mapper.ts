import { COMMENT_CATEGORIES, type CommentCategory, type CommentDto } from '@acms/shared';
import type { Comment } from '../../generated/prisma/client.js';

function toCategory(value: string | null): CommentCategory | null {
  return (COMMENT_CATEGORIES as readonly string[]).includes(value ?? '') ? (value as CommentCategory) : null;
}

export function toCommentDto(comment: Comment): CommentDto {
  return {
    id: comment.id,
    content: comment.content,
    is_valid: comment.isValid,
    is_question: comment.isQuestion,
    category: toCategory(comment.category),
    confidence: comment.confidence === null ? null : comment.confidence.toNumber(),
    reason: comment.reason,
    moderated_at: comment.moderatedAt?.toISOString() ?? null,
    created_at: comment.createdAt.toISOString(),
    updated_at: comment.updatedAt.toISOString(),
  };
}
